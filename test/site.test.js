const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const root = path.resolve(__dirname, '..');

function readJson(file) {
    return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

describe('portfolio site', () => {
    it('has valid project data and existing media files', () => {
        const projects = readJson('projects.json');

        assert.ok(Array.isArray(projects), 'projects.json should contain an array');
        assert.ok(projects.length > 0, 'projects.json should contain at least one project');

        for (const project of projects.filter((item) => item.status === 'live')) {
            assert.equal(typeof project.title, 'string', 'live projects need a title');
            assert.equal(typeof project.client, 'string', 'live projects need a client');
            assert.equal(typeof project.count, 'number', 'live projects need a numeric count');
            assert.equal(typeof project.image, 'string', 'live projects need an image path');
            assert.ok(
                fs.existsSync(path.join(root, project.image)),
                `missing project image: ${project.image}`
            );

            if (project.audio) {
                assert.ok(
                    fs.existsSync(path.join(root, project.audio)),
                    `missing project audio: ${project.audio}`
                );
            }

            for (const file of project.gallery || []) {
                assert.ok(
                    fs.existsSync(path.join(root, file)),
                    `missing gallery file: ${file}`
                );
            }
        }
    });

    it('gives every live project a unique slug for its project page', () => {
        const live = readJson('projects.json').filter((item) => item.status === 'live');
        const slugs = live.map((project) => project.slug);

        for (const slug of slugs) {
            assert.ok(typeof slug === 'string' && slug.length > 0, 'live projects need a slug');
        }
        assert.equal(new Set(slugs).size, slugs.length, 'project slugs must be unique');
    });

    it('has valid services with existing preview files', () => {
        const services = readJson('site.json').services;

        assert.ok(Array.isArray(services), 'site.json should contain a "services" array');
        for (const service of services) {
            assert.ok(typeof service.name === 'string' && service.name.length > 0, 'every service needs a name');
            if (service.preview) {
                assert.ok(
                    fs.existsSync(path.join(root, service.preview)),
                    `missing preview for ${service.name}: ${service.preview}`
                );
            }
        }

        const names = services.map((service) => service.name);
        assert.equal(new Set(names).size, names.length, 'service names must be unique');
    });

    it('only tags live projects with services listed in site.json', () => {
        const names = readJson('site.json').services.map((service) => service.name);
        const live = readJson('projects.json').filter((item) => item.status === 'live');

        for (const project of live) {
            for (const service of project.services || []) {
                assert.ok(
                    names.includes(service),
                    `${project.slug} uses "${service}", which isn't a service in site.json (check the spelling)`
                );
            }
        }
    });

    it('only uses tweak pane variables that exist in style.css', () => {
        const tweaks = fs.readFileSync(path.join(root, 'tweaks.js'), 'utf8');
        const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
        const variables = new Set(tweaks.match(/variable: '(--[\w-]+)'/g).map((m) => m.slice(11, -1)));

        assert.ok(variables.size > 0, 'tweaks.js should list its controls');
        for (const name of variables) {
            assert.ok(css.includes(`${name}:`), `tweaks.js controls ${name}, but style.css never defines it`);
        }
    });

    it('saves tweak values into :root without touching anything else', () => {
        const { updateRootValues } = require('../tweaks-server.js');
        const css = ':root {\n    --a: 1rem;   /* TWEAK: a */\n    --b: 2;\n}\n\n.x { --a: 9px; }\n';

        const result = updateRootValues(css, { '--a': '3rem' });
        assert.equal(result, css.replace('--a: 1rem;', '--a: 3rem;'), 'only the :root value should change');

        assert.throws(() => updateRootValues(css, { '--missing': '1' }), /isn't in style.css/);
        assert.throws(() => updateRootValues(css, { '--a': '1px; } body { display: none' }), /unsafe value/);
        assert.throws(() => updateRootValues(css, { 'color': 'red' }), /not a variable name/);
    });

    it('saves a featured tick into projects.json without touching anything else', () => {
        const { updateFeatured } = require('../tweaks-server.js');
        const json = '[\n{\n  "title": "A",\n  "slug": "a",\n  "featured": true,\n  "gallery": ["x.png"]\n},\n{\n  "title": "B",\n  "slug": "b",\n  "date": "2024"\n}\n]\n';

        // Flipping an existing line changes only that line
        assert.equal(updateFeatured(json, 'a', false), json.replace('"featured": true', '"featured": false'));

        // A project without the line gets one under its slug, and the JSON stays valid
        const added = updateFeatured(json, 'b', true);
        assert.equal(JSON.parse(added).find((work) => work.slug === 'b').featured, true);
        assert.ok(added.includes('  "slug": "b",\n  "featured": true,\n  "date"'));

        assert.throws(() => updateFeatured(json, 'nope', true), /no project/);
        assert.throws(() => updateFeatured(json, 'a"]', true), /not a slug/);
        assert.throws(() => updateFeatured(json, 'a', 'yes'), /true or false/);
    });

    it('has existing local assets linked from each page', () => {
        for (const page of ['index.html', 'about.html', 'work.html', 'project.html', 'contact.html']) {
            const html = fs.readFileSync(path.join(root, page), 'utf8');
            const references = html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g);

            for (const [, reference] of references) {
                if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;

                const localPath = reference.split(/[?#]/, 1)[0];
                assert.ok(
                    fs.existsSync(path.resolve(root, path.dirname(page), localPath)),
                    `${page} references missing local asset: ${reference}`
                );
            }
        }
    });
});
