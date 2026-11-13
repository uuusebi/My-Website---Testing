# Project Overview
- **Goal:** A multi-page portfolio website with interactive animations.
- **Tech Stack:** Plain HTML, CSS and JavaScript. No framework, no bundler, no CSS or animation libraries, and no npm dependencies.
  - **Animations:** CSS `@keyframes` and `transition`s, timed with the custom properties in `style.css` (`--ease-out`, `--speed-med`, `--speed-slow`). JS adds `IntersectionObserver` for scroll reveals and `requestAnimationFrame` for effects that follow the cursor or the scroll.
  - **Accessibility:** Motion respects `prefers-reduced-motion`, both in the `@media` block at the end of `style.css` and in JS checks like the one in `hero.js`. New animations must do the same.
  - **Fonts:** System Helvetica Neue / Helvetica / Arial stack (no web fonts).
- **Deployment:** Cloudflare Pages (`wrangler.toml`), repo on GitHub (`uuusebi/My-Website---Testing`).

# Key Commands
- **Start local dev server:** `npm run dev` (runs `wrangler pages dev .`; uses the globally installed Wrangler CLI)
- **Run tests:** `npm test` (Node's built-in test runner, `node --test`)
- **Build project:** None. Files are served exactly as they are.
- Pages load JSON with `fetch()`, so open them through the dev server, not as `file://`.

# Folder Structure
Everything lives at the project root (no `/src`):
- **Pages:** `index.html` (Work), `about.html`, `contact.html`, `archive.html`
- **Styles:** `style.css`, one shared stylesheet. Design tokens (colors, radii, glass, shadows, easing) are in `:root` at the top.
- **Scripts:** one file per job, loaded at the bottom of `<body>`:
  - `nav.js`: builds the top bar on every page from `site.json`
  - `hero.js`: hero intro animation and scroll-out effect (Home and About)
  - `script.js`: Work grid and project lightbox, built from `projects.json`
  - `archive.js`: Archive list with a preview image that follows the cursor
  - `contact.js`: fills in the Contact page from `site.json`
- **Data:**
  - `projects.json`: the list of projects. Only entries with `"status": "live"` are checked by tests.
  - `site.json`: email, phone, location and social links
- **Media:** `projects/<client>/<project>/` holds the images, video and audio for each project. Paths in `projects.json` start with `projects/…`.
- **Tests:** `test/site.test.js` checks that the JSON is valid and that every referenced media file exists. Run it after adding or moving projects.

# Coding & Learning Rules
1. **Explain the "Why":** After writing or modifying code, briefly explain how the logic or animation works so I can learn from the changes.
2. **Keep It Modular:** Keep CSS and JavaScript clean and well-commented. Do not dump large blocks of inline styles or scripts into HTML files.
3. **Ask Before Major Changes:** If a request affects more than two files or requires installing a new package, outline the approach first.
4. **Preserve Existing Work:** Do not delete or rewrite unrelated sections of a file when making targeted edits.
