# Project Overview
- **Goal:** A multi-page portfolio website with interactive animations.
- **Tech Stack:** Plain HTML, CSS and JavaScript. No framework, no bundler, no CSS or animation libraries, and no npm dependencies.
  - **Animations:** CSS `@keyframes` and `transition`s, timed with the custom properties in `style.css` (`--ease-out`, `--speed-med`, `--speed-slow`). JS adds `IntersectionObserver` for scroll reveals and `requestAnimationFrame` for effects that follow the cursor or the scroll.
  - **Accessibility:** Motion respects `prefers-reduced-motion`, both in the `@media` block at the end of `style.css` and in JS checks like the one in `hero.js`. New animations must do the same.
  - **Fonts:** System Helvetica Neue / Helvetica / Arial stack (no web fonts).
- **Deployment:** Cloudflare Pages (`wrangler.toml`), repo on GitHub (`uuusebi/My-Website---Testing`).

# Key Commands
- **Start local dev server:** `npm run dev` (starts the tweak pane's save helper `tweaks-server.js`, then `wrangler pages dev .`; uses the globally installed Wrangler CLI)
- **Run tests:** `npm test` (Node's built-in test runner, `node --test`)
- **Build project:** None. Files are served exactly as they are.
- Pages load JSON with `fetch()`, so open them through the dev server, not as `file://`.

# Folder Structure
Everything lives at the project root (no `/src`):
- **Pages:** every page enters with a grain + blur fade (`body::before` and `.topbar, main` in `style.css`).
  - `index.html`: Home, played as a sequence of full-screen `.home-stage`s: intro (hero), then services, then a works grid of featured projects, with the contact CTA under the grid.
  - `work.html`: the **Index** (nav label "Index"; the file can't be `index.html`, which is Home). A `View:` selector switches between Gallery (description, title list, preview stage, thumbnail grid) and List (rows with a preview that follows the cursor), kept in the URL as `?view=gallery|list`. The Filter works in both views.
  - `project.html`: one template for every project (`?slug=…`), scrolling endlessly from one project into the next.
  - `about.html`, `contact.html`
  - `_redirects`: Cloudflare Pages redirects. The old `/archive.html` goes to `/work.html?view=list`.
- **Styles:** `style.css`, one shared stylesheet. Design tokens (colors, radii, glass, shadows, easing) are in `:root` at the top.
- **Scripts:** one file per job, loaded at the bottom of `<body>`:
  - `nav.js`: builds the top bar on every page from `site.json`
  - `hero.js`: hero intro animation and scroll-out effect (Home and About). Dispatches `hero:done` when the intro finishes typing.
  - `script.js`: the Index page.
    - Gallery: hovering a thumbnail or title (mouse only) previews it on the stage and types its description.
    - List: rows with a preview that follows the cursor.
    - Also builds the Filter and the Gallery/List view switch. Thumbnails, titles and rows are `<a>` links to the project page.
  - `home.js`: the Home sequence.
    - Stages fade out and in through blur. Scrolling, a click, ArrowDown/Space or a swipe skips ahead.
    - Services highlight one by one.
    - The works grid shows every image of the `"featured": true` projects; hovering one blurs the other projects, and the title follows the cursor.
    - With reduced motion, the stages are a plain stacked page.
  - `project.js`: the endless project scroll.
    - Each project is an `<article class="project">` with its main media, description, optional `gallery`, and a small Contact button at the end.
    - Near the end, the next project is added; after the last one it loops to the first.
    - Each article is sticky and pins at its bottom while the next slides over it, shrinking and fading (`--project-cover`).
    - The URL and title follow the project on screen, and project.js announces it with a `project:change` event.
  - `contact.js`: fills in the Contact page from `site.json`
  - `tweaks.js`: dev-only tweak pane with sliders for the motion and layout variables in `style.css` `:root`. `nav.js` loads it only on `localhost`/`127.0.0.1`, so it never appears on the live site. `Shift+T` shows or hides it. A red label means unsaved. **Save** sends the unsaved values to `tweaks-server.js` (port 8789, local only), which rewrites just those values in `style.css` `:root`; the labels then turn black. Sliders are grouped in `SECTIONS`, one per part of the site, each with a description and a hint per slider. After a change, the affected animation replays: CSS animations through the `.tweaks-restart` class, and JS animations through a `tweaks:replay` event that `hero.js` and `script.js` listen for. A new tweakable value goes in a section's `controls` and in `:root`. On the Index and project pages, "Featured" tick boxes choose which projects show on Home; Save writes those to the `"featured"` line in `projects.json` (one line per project, nothing else changes).
- **Data:**
  - `projects.json`: the list of projects. Only entries with `"status": "live"` are checked by tests.
  - `site.json`: email, phone, location and social links
- **Media:** `projects/<client>/<project>/` holds the images, video and audio for each project. Paths in `projects.json` start with `projects/…`.
- **Tests:** `test/site.test.js` checks that the JSON is valid and that every referenced media file exists. Run it after adding or moving projects.

# Coding & Learning Rules
1. **Explain the "Why":** Before editing, briefly say what will change, in which files, and any future side effects (if relevant). After, briefly explain how the logic or animation works so I can learn from the changes. Keep both short.
2. **Keep It Modular:** Keep CSS and JavaScript clean and well-commented. Do not dump large blocks of inline styles or scripts into HTML files.
3. **Ask Before Major Changes:** If a request affects more than two files or requires installing a new package, outline the approach first.
4. **Preserve Existing Work:** Do not delete or rewrite unrelated sections of a file when making targeted edits.
5. **Naming:** child classes start with their container's name (`.work-info` → `.work-info-title`). An id, when JS needs one, matches its class.
6. **Tweak comments:** mark every value behind a requested visual change with `TWEAK: <effect>` so I can find and adjust it.
