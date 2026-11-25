/* ============================================================
   tweaks-server.js: tiny local helper behind the tweak pane's Save button.
   `npm run dev` starts it next to Wrangler. A web page can't write files
   on its own, so the pane sends its changes here, and this writes them:
   - slider values  → style.css :root
   - featured ticks → the "featured" line of each project in projects.json

   Safety rules (it's a dev tool, but it still writes to your code):
   - only listens on 127.0.0.1 (your own computer), and only answers localhost pages
   - only changes the VALUE of variables that already exist in style.css :root
     (names, comments and every other line stay exactly as they are)
   - rejects any value that could break out of its line (; { } or a new line)
   - in projects.json, only changes "featured" for a slug that exists, and checks
     the file is still valid JSON before writing it
   - never touches any file other than style.css and projects.json
   No npm packages: just Node's built-in http and fs.
   ============================================================ */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 8789;                                       // tweaks.js sends to this port
const CSS_FILE = path.join(__dirname, 'style.css');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const SAFE_SLUG = /^[a-z0-9-]+$/;
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const SAFE_NAME = /^--[a-z0-9-]+$/;
const SAFE_VALUE = /^[^;{}\n\r]{1,200}$/;

// Swaps values inside the first :root { … } block of the CSS text.
// Returns the new CSS, or throws if a name or value isn't allowed.
function updateRootValues(css, values) {
    const start = css.indexOf(':root {');
    const end = css.indexOf('\n}', start);
    if (start === -1 || end === -1) throw new Error('style.css has no :root { } block');

    let block = css.slice(start, end);
    for (const [name, value] of Object.entries(values)) {
        if (!SAFE_NAME.test(name)) throw new Error(`not a variable name: ${name}`);
        if (!SAFE_VALUE.test(String(value))) throw new Error(`unsafe value for ${name}: ${value}`);

        // "    --name: old;   /* comment */"  →  only "old" changes
        const line = new RegExp(`^(\\s*${name}\\s*:\\s*)[^;]*;`, 'm');
        if (!line.test(block)) throw new Error(`${name} isn't in style.css :root`);
        block = block.replace(line, (match, before) => `${before}${String(value).trim()};`);
    }
    return css.slice(0, start) + block + css.slice(end);
}

// Sets "featured": true/false on one project in the projects.json TEXT, touching only that line
// (or adding it under the slug line if the project doesn't have one yet). Throws if anything's off.
function updateFeatured(json, slug, featured) {
    if (!SAFE_SLUG.test(slug)) throw new Error(`not a slug: ${slug}`);
    if (typeof featured !== 'boolean') throw new Error(`featured must be true or false for ${slug}`);

    const slugLine = new RegExp(`^([ \\t]*)"slug"\\s*:\\s*"${slug}"\\s*,?[ \\t]*$`, 'm');
    const match = slugLine.exec(json);
    if (!match) throw new Error(`no project with slug ${slug}`);

    // The project's { … } (projects hold arrays but no nested objects)
    const start = json.lastIndexOf('{', match.index);
    const end = json.indexOf('}', match.index);
    let project = json.slice(start, end);

    const featuredLine = /"featured"\s*:\s*(true|false)/;
    if (featuredLine.test(project)) {
        project = project.replace(featuredLine, `"featured": ${featured}`);
    } else {
        const at = match.index - start + match[0].length;       // just after the slug line
        project = `${project.slice(0, at)}\n${match[1]}"featured": ${featured},${project.slice(at)}`;
    }

    const result = json.slice(0, start) + project + json.slice(end);
    const check = JSON.parse(result).find((work) => work.slug === slug);   // throws if the JSON broke
    if (!check || check.featured !== featured) throw new Error(`could not update ${slug}`);
    return result;
}

function startServer() {
    const server = http.createServer((req, res) => {
        const origin = req.headers.origin || '';
        const reply = (status, data) => {
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        };

        if (!LOCAL_ORIGIN.test(origin)) return reply(403, { error: 'only localhost pages can save' });
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return reply(204, {});   // the browser's "may I?" check before the POST
        if (req.method !== 'POST' || req.url !== '/save') return reply(404, { error: 'not found' });

        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 20000) req.destroy();          // the pane never sends this much
        });
        req.on('end', () => {
            try {
                const { values = {}, featured = {} } = JSON.parse(body);

                // Work everything out first, then write, so a bad entry saves nothing
                let css = null;
                let projects = null;
                if (Object.keys(values).length) {
                    css = updateRootValues(fs.readFileSync(CSS_FILE, 'utf8'), values);
                }
                if (Object.keys(featured).length) {
                    projects = fs.readFileSync(PROJECTS_FILE, 'utf8');
                    for (const [slug, on] of Object.entries(featured)) projects = updateFeatured(projects, slug, on);
                }

                if (css !== null) {
                    fs.writeFileSync(CSS_FILE, css);
                    console.log(`[tweaks] saved ${Object.keys(values).join(', ')} to style.css`);
                }
                if (projects !== null) {
                    fs.writeFileSync(PROJECTS_FILE, projects);
                    console.log(`[tweaks] saved featured: ${JSON.stringify(featured)} to projects.json`);
                }
                reply(200, { saved: [...Object.keys(values), ...Object.keys(featured)] });
            } catch (error) {
                reply(400, { error: error.message });
            }
        });
    });

    server.on('error', (error) => {
        // Don't crash `npm run dev` if the helper is already running in another terminal
        console.warn(`[tweaks] save helper not started: ${error.message}`);
    });

    server.listen(PORT, '127.0.0.1', () => {
        console.log(`[tweaks] save helper ready on http://127.0.0.1:${PORT}`);
    });

    // `npm run dev` starts this in the background, where Ctrl+C doesn't reach it.
    // So it checks once a second whether whatever started it (npm run dev) has stopped, and quits too.
    const parent = process.ppid;
    setInterval(() => {
        if (process.ppid !== parent) process.exit(0);
    }, 1000).unref();                                    // unref: this timer alone never keeps Node running
}

if (require.main === module) startServer();              // `node tweaks-server.js` runs it; tests just borrow the function
module.exports = { updateRootValues, updateFeatured };
