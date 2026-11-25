/* ============================================================
   tweaks.js: dev-only tweak pane (loaded by nav.js on localhost only)
   1. Sections + controls   2. Replay   3. Values + storage
   4. Build the pane        5. Buttons  6. Shift+T shortcut
   Every slider changes one CSS variable from style.css :root.
   After you pause on a change, the animation it affects replays.
   Red label = not saved yet. "Save" writes the values into style.css
   (through tweaks-server.js, started by npm run dev) and turns them black.
   On the Index and project pages, "Featured" ticks choose which projects
   show on the Home page; Save writes those into projects.json.
   ============================================================ */

(function () {
    if (window.tweaksReady) return;                      // never build two panes
    window.tweaksReady = true;

    // ---------- 1. Sections + controls ----------
    // Each section is one part of the site. To add a slider, add a line to a section's
    // controls AND the variable to style.css :root.
    //   pages:  where it's listed first and open ('*' = every page). It's on every page either way.
    //   replay: what replays after a change (see section 2). null = it updates live, nothing to replay.
    //   unit:   what's written into the CSS ('' = a plain number, e.g. ms that JS reads).
    const SECTIONS = [
        {
            title: 'Project: Handoff',
            about: 'At the end of a project it pins in place, shrinks and fades while the next project slides up over it. Scroll to the end of a project to see changes.',
            pages: ['project'],
            replay: null,
            controls: [
                { label: 'Shrink to', hint: 'Size while covered (1 = no shrink)', variable: '--project-cover-scale', min: 0.7, max: 1, step: 0.01, unit: '' },
                { label: 'Fade', hint: 'How much it fades while covered (0 = none, 1 = fully)', variable: '--project-cover-dim', min: 0, max: 1, step: 0.05, unit: '' },
            ],
        },
        {
            title: 'All pages: Page entry',
            about: 'Every page fades in through film grain and blur when it opens. The grain fades out completely.',
            pages: ['*'],
            replay: 'enter',
            controls: [
                { label: 'Blur', hint: 'How blurry the page starts', variable: '--enter-blur', min: 0, max: 80, step: 1, unit: 'px' },
                { label: 'Grain', hint: 'How strong the grain starts (0 = none, 1 = full)', variable: '--grain-amount', min: 0, max: 1, step: 0.05, unit: '' },
                { label: 'Entry time', hint: 'How long the blur and grain take to clear', variable: '--enter-duration', min: 0.2, max: 6, step: 0.1, unit: 's' },
            ],
        },
        {
            title: 'Hero: Home page',
            about: 'Stage 01 of Home: your name types in letter by letter and blurs into focus. (On About it also blurs away as you scroll.)',
            pages: ['index', 'about'],
            replay: 'hero',
            controls: [
                { label: 'Start delay', hint: 'Wait before the name starts typing (ms)', variable: '--hero-start-delay', min: 0, max: 2000, step: 50, unit: '' },
                { label: 'Name speed', hint: 'Time per letter of your name (ms). Lower = faster', variable: '--hero-title-speed', min: 10, max: 300, step: 5, unit: '' },
                { label: 'Text speed', hint: 'Time per letter of the paragraph (ms)', variable: '--hero-intro-speed', min: 2, max: 100, step: 1, unit: '' },
                { label: 'Blur', hint: 'Blur at the start of the intro and when scrolled away', variable: '--hero-blur', min: 0, max: 80, step: 1, unit: 'px' },
                { label: 'Focus time', hint: 'How long blur-to-sharp takes', variable: '--hero-focus-duration', min: 0, max: 6, step: 0.1, unit: 's' },
                { label: 'Scroll range', hint: 'How far you scroll (× window height) before the hero is gone. Scroll to see it', variable: '--hero-scroll-range', min: 0.1, max: 1.5, step: 0.05, unit: '' },
            ],
        },
        {
            title: 'Home: Sequence',
            about: 'Home plays intro → services → works on its own. Each stage fades out through blur and the next fades in. Changes replay the whole sequence.',
            pages: ['index'],
            replay: 'hero',
            controls: [
                { label: 'Stage fade', hint: 'How long a stage takes to fade out, and the next to fade in (ms)', variable: '--stage-fade', min: 100, max: 3000, step: 50, unit: '' },
                { label: 'Intro hold', hint: 'How long the intro stays after it finishes typing (ms)', variable: '--intro-hold', min: 0, max: 5000, step: 100, unit: '' },
                { label: 'Service hold', hint: 'How long each service stays highlighted (ms)', variable: '--service-hold', min: 500, max: 6000, step: 100, unit: '' },
            ],
        },
        {
            title: 'Home: Works grid',
            about: 'The last stage: every image of the featured projects. Hovering one keeps it sharp and blurs the rest. Updates live (skip to the works to see it).',
            pages: ['index'],
            replay: null,
            controls: [
                { label: 'Columns', hint: 'Columns across the grid (on big screens)', variable: '--works-columns', min: 3, max: 12, step: 1, unit: '' },
                { label: 'Gap', hint: 'Space between works (rows get 3× this)', variable: '--works-gap', min: 0, max: 6, step: 0.25, unit: 'rem' },
                { label: 'Hover blur', hint: 'Blur on the other projects while one is hovered', variable: '--works-blur', min: 0, max: 40, step: 1, unit: 'px' },
            ],
        },
        {
            title: 'Index: Description typing',
            about: 'Hover a project and its description types in under the title. Replays on the project shown.',
            pages: ['work'],
            replay: 'work-typing',
            controls: [
                { label: 'Hover rest', hint: 'How long the cursor must rest before typing starts (ms)', variable: '--work-typing-delay', min: 0, max: 1500, step: 50, unit: '' },
                { label: 'Speed', hint: 'Time per letter (ms). Lower = faster', variable: '--work-typing-speed', min: 5, max: 150, step: 5, unit: '' },
                { label: 'Max time', hint: 'Long descriptions speed up to finish within this (ms)', variable: '--work-typing-max', min: 200, max: 5000, step: 100, unit: '' },
            ],
        },
        {
            title: 'Index: Title, text & preview',
            about: 'Gallery view: positions and sizes of the title, description and big preview. These update live.',
            pages: ['work'],
            replay: null,
            controls: [
                { label: 'Title size', hint: 'The big WORK / project name', variable: '--work-title-size', min: 1, max: 8, step: 0.1, unit: 'rem' },
                { label: 'Title width', hint: 'Wider = long names wrap onto fewer lines', variable: '--work-title-width', min: 10, max: 60, step: 1, unit: 'rem' },
                { label: 'Text width', hint: 'Width of the description paragraph', variable: '--work-text-width', min: 12, max: 40, step: 0.5, unit: 'rem' },
                { label: 'Text lines', hint: 'Lines reserved for the description (moves the preview down)', variable: '--work-text-lines', min: 1, max: 12, step: 1, unit: '' },
                { label: 'Preview height', hint: 'Big preview image (stays between 240px and 520px)', variable: '--work-stage-height', min: 20, max: 70, step: 1, unit: 'vh' },
                { label: 'Gap above', hint: 'Space between the description and the preview', variable: '--work-stage-gap-top', min: 0, max: 6, step: 0.25, unit: 'rem' },
                { label: 'Gap below', hint: 'Space between the preview and the thumbnails', variable: '--work-stage-gap-bottom', min: 0, max: 20, step: 0.5, unit: 'vh' },
            ],
        },
        {
            title: 'Index: Thumbnails',
            about: 'The grid of small images. They fade up one after another when the page loads.',
            pages: ['work'],
            replay: 'thumbs',
            controls: [
                { label: 'Size', hint: 'Thumbnail size (stays between 48px and 96px)', variable: '--work-thumb-size', min: 4, max: 14, step: 0.5, unit: 'vh' },
                { label: 'Gap', hint: 'Space between thumbnails, across and down', variable: '--work-thumb-gap', min: 0, max: 4, step: 0.1, unit: 'rem' },
                { label: 'Stagger', hint: 'Delay between one thumbnail and the next', variable: '--stagger-thumb', min: 0, max: 200, step: 5, unit: 'ms' },
            ],
        },
        {
            title: 'Index: List view preview',
            about: 'In the Index List view, the image that follows your cursor over a row. Hover a row to see changes.',
            pages: ['work'],
            replay: null,
            controls: [
                { label: 'Size', hint: 'Width and height of the preview', variable: '--list-preview-size', min: 120, max: 500, step: 10, unit: 'px' },
                { label: 'Cursor gap', hint: 'Space between the cursor and the preview', variable: '--list-preview-offset', min: 0, max: 80, step: 2, unit: 'px' },
                { label: 'Start scale', hint: 'How small it starts before popping in (1 = no pop)', variable: '--list-preview-scale', min: 0.5, max: 1, step: 0.01, unit: '' },
            ],
        },
        {
            title: 'All pages: Shared motion',
            about: 'Timing shared by several animations: thumbnail reveals, the hero focus, page entry, and the Home services fade.',
            pages: ['*'],
            replay: 'all',
            controls: [
                { label: 'Easing', hint: 'The curve every reveal and hover follows', variable: '--ease-out', type: 'select', options: [
                    ['Soft out (default)', 'cubic-bezier(0.16, 1, 0.3, 1)'],
                    ['Snappy out', 'cubic-bezier(0.22, 1, 0.36, 1)'],
                    ['Back out (overshoot)', 'cubic-bezier(0.34, 1.56, 0.64, 1)'],
                    ['Ease in-out', 'cubic-bezier(0.65, 0, 0.35, 1)'],
                    ['Linear', 'linear'],
                ] },
                { label: 'Reveal speed', hint: 'How long each Index thumbnail takes to rise in', variable: '--speed-slow', min: 0, max: 3, step: 0.05, unit: 's' },
                { label: 'Hover speed', hint: 'Home services: how fast a title turns black and its preview fades in', variable: '--speed-med', min: 0, max: 2, step: 0.05, unit: 's' },
            ],
        },
    ];

    // Every control in one list, for saving, resetting and copying
    const CONTROLS = SECTIONS.flatMap((section) => section.controls);

    // ---------- 2. Replay ----------
    // CSS animations restart when tweaks-restart (animation: none) is on for one frame.
    // JS animations (the hero, the Work typing) listen for a "tweaks:replay" event in their own file.
    const CSS_REPLAYS = {
        enter: 'body, .topbar, main',                    // body = its ::before grain
        thumbs: '.thumb',
    };
    const ALL_PARTS = ['enter', 'hero', 'thumbs', 'work-typing'];
    const REPLAY_PAUSE = 400;                            // ms after your last change before it replays

    function replay(part) {
        const selector = CSS_REPLAYS[part];
        if (selector) {
            const els = document.querySelectorAll(selector);
            els.forEach((el) => el.classList.add('tweaks-restart'));
            void document.body.offsetWidth;              // forces the browser to apply it before removing it
            els.forEach((el) => el.classList.remove('tweaks-restart'));
        }
        document.dispatchEvent(new CustomEvent('tweaks:replay', { detail: { part } }));
    }

    const pendingParts = new Set();
    let replayTimer = null;

    // Waits until you stop dragging, then replays every part you touched
    function scheduleReplay(part) {
        if (!part) return;
        (part === 'all' ? ALL_PARTS : [part]).forEach((p) => pendingParts.add(p));
        clearTimeout(replayTimer);
        replayTimer = setTimeout(() => {
            pendingParts.forEach(replay);
            pendingParts.clear();
        }, REPLAY_PAUSE);
    }

    // ---------- 3. Values + storage ----------
    const STORE_VALUES = 'tweaksValues';     // unsaved values { "--work-thumb-size": "10vh", ... } (nav.js reads this too)
    const SAVE_URL = 'http://127.0.0.1:8789/save';       // tweaks-server.js
    const STORE_HIDDEN = 'tweaksHidden';
    const root = document.documentElement;

    // localStorage can be blocked (private windows), so every access is wrapped
    function load(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    }
    function save(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* not saved, still works live */ }
    }

    // "unsaved" = values that differ from what's written in style.css (shown red)
    const unsaved = load(STORE_VALUES, {});

    // Featured ticks work the same way, against projects.json
    const STORE_FEATURED = 'tweaksFeatured';             // unsaved { "dynama": false, ... }
    const unsavedFeatured = load(STORE_FEATURED, {});
    const fileFeatured = {};                             // what projects.json says, filled in section 4b
    const featuredRows = new Map();                      // slug → { row, box } for the rows on screen

    // The stylesheet's own value: briefly remove the override, read it, put the override back
    function stylesheetValue(variable) {
        const override = root.style.getPropertyValue(variable);
        root.style.removeProperty(variable);
        const value = getComputedStyle(root).getPropertyValue(variable).trim();
        if (override) root.style.setProperty(variable, override);
        return value;
    }

    // What style.css says right now. After a Save, the saved values become the new file values.
    const fileValues = {};
    CONTROLS.forEach((c) => { fileValues[c.variable] = stylesheetValue(c.variable); });

    // Red when the value isn't in style.css yet, black when it matches the file
    function markRow(control) {
        control.row.classList.toggle('unsaved', control.variable in unsaved);
    }

    // Writes one value onto the page and remembers whether it still needs saving.
    // The value is always set on the page itself, because after a Save the loaded
    // stylesheet is out of date until the next reload.
    function setValue(control, value) {
        root.style.setProperty(control.variable, value);
        if (value === fileValues[control.variable]) delete unsaved[control.variable];
        else unsaved[control.variable] = value;
        save(STORE_VALUES, unsaved);
        markRow(control);
        updateSaveLabel();
    }

    // ---------- 4. Build the pane ----------
    const page = (location.pathname.split('/').pop() || 'index').replace('.html', '');
    const isHere = (section) => section.pages.includes(page);

    const pane = document.createElement('aside');
    pane.className = 'tweaks';
    pane.setAttribute('aria-label', 'Tweak pane');
    pane.innerHTML = `
        <div class="tweaks-header">
            <strong class="tweaks-title">Tweaks</strong>
            <span class="tweaks-hint">Shift+T hides</span>
        </div>
        <div class="tweaks-body"></div>
        <div class="tweaks-actions">
            <button type="button" class="tweaks-button" data-action="save">Save</button>
            <button type="button" class="tweaks-button" data-action="replay">Replay all</button>
            <button type="button" class="tweaks-button" data-action="reset">Reset</button>
        </div>
    `;
    const body = pane.querySelector('.tweaks-body');
    const saveButton = pane.querySelector('[data-action="save"]');

    // "Save (2)" = two changes not in the files yet
    function updateSaveLabel() {
        const count = Object.keys(unsaved).length + Object.keys(unsavedFeatured).length;
        saveButton.textContent = count ? `Save (${count})` : 'Save';
    }
    updateSaveLabel();

    function buildRow(control, section) {
        const current = unsaved[control.variable] ?? fileValues[control.variable];
        const row = document.createElement('label');
        row.className = 'tweaks-row';
        control.row = row;
        markRow(control);

        const name = document.createElement('span');
        name.className = 'tweaks-row-label';
        name.textContent = control.label;
        name.title = control.variable;                   // hover a label to see its variable name
        row.appendChild(name);

        // Called by every input: apply the value, then replay this section's animation
        const change = (value) => {
            setValue(control, value);
            scheduleReplay(section.replay);
        };

        if (control.type === 'select') {
            const select = document.createElement('select');
            select.className = 'tweaks-row-select';
            control.options.forEach(([text, value]) => select.add(new Option(text, value)));
            // If the stylesheet's value isn't a preset, add it so nothing is lost
            if (![...select.options].some((o) => o.value === current)) select.add(new Option(current, current), 0);
            select.addEventListener('change', () => change(select.value));
            row.appendChild(select);
            control.sync = (value) => { select.value = value; };
        } else {
            // A slider and a number box that move together
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'tweaks-row-slider';
            const box = document.createElement('input');
            box.type = 'number';
            box.className = 'tweaks-row-number';
            [slider, box].forEach((input) => {
                input.min = control.min;
                input.max = control.max;
                input.step = control.step;
                input.addEventListener('input', () => {
                    const number = input.value;
                    if (number === '') return;
                    slider.value = box.value = number;
                    change(number + control.unit);
                });
            });
            const unit = document.createElement('span');
            unit.className = 'tweaks-row-unit';
            unit.textContent = control.unit;
            row.append(slider, box, unit);
            control.sync = (value) => { slider.value = box.value = parseFloat(value); };
        }

        const hint = document.createElement('span');
        hint.className = 'tweaks-row-hint';
        hint.textContent = control.hint;
        row.appendChild(hint);

        control.sync(current);
        return row;
    }

    // This page's sections first, then the shared one, then the other pages' (collapsed)
    const ordered = [
        ...SECTIONS.filter(isHere),
        ...SECTIONS.filter((s) => s.pages.includes('*')),
        ...SECTIONS.filter((s) => !isHere(s) && !s.pages.includes('*')),
    ];

    ordered.forEach((section) => {
        const details = document.createElement('details');
        details.className = 'tweaks-section';
        details.open = isHere(section) || section.pages.includes('*');

        const summary = document.createElement('summary');
        summary.className = 'tweaks-section-title';
        summary.textContent = section.title;
        const about = document.createElement('p');
        about.className = 'tweaks-section-about';
        about.textContent = section.about;
        details.append(summary, about);

        section.controls.forEach((control) => details.appendChild(buildRow(control, section)));
        body.appendChild(details);
    });

    // ---------- 4b. Featured projects (Index and project pages) ----------
    // One tick box per project: ticked = shown in the Home page works grid.
    function markFeatured(slug) {
        const entry = featuredRows.get(slug);
        if (!entry) return;
        entry.box.checked = unsavedFeatured[slug] ?? fileFeatured[slug];
        entry.row.classList.toggle('unsaved', slug in unsavedFeatured);
    }

    function featuredRow(work) {
        const row = document.createElement('label');
        row.className = 'tweaks-row';

        const name = document.createElement('span');
        name.className = 'tweaks-row-label';
        name.textContent = work.title;
        name.title = work.slug;

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'tweaks-row-checkbox';
        box.addEventListener('change', () => {
            if (box.checked === fileFeatured[work.slug]) delete unsavedFeatured[work.slug];
            else unsavedFeatured[work.slug] = box.checked;
            save(STORE_FEATURED, unsavedFeatured);
            markFeatured(work.slug);
            updateSaveLabel();
        });

        const hint = document.createElement('span');
        hint.className = 'tweaks-row-hint';
        hint.textContent = 'Ticked = shown in the Home page works grid';

        row.append(name, box, hint);
        featuredRows.set(work.slug, { row, box });
        markFeatured(work.slug);
        return row;
    }

    async function buildFeatured() {
        if (page !== 'work' && page !== 'project') return;

        let works;
        try {
            const response = await fetch('projects.json', { cache: 'no-store' });   // always the latest file
            works = (await response.json())
                .filter((work) => work.status === 'live')
                .sort((a, b) => a.count - b.count);
        } catch {
            return;                                      // no projects, no section
        }
        works.forEach((work) => { fileFeatured[work.slug] = work.featured === true; });

        // Forget remembered ticks that already match the file (or whose project is gone)
        Object.keys(unsavedFeatured).forEach((slug) => {
            if (!(slug in fileFeatured) || unsavedFeatured[slug] === fileFeatured[slug]) delete unsavedFeatured[slug];
        });
        save(STORE_FEATURED, unsavedFeatured);

        const details = document.createElement('details');
        details.className = 'tweaks-section';
        details.open = true;
        const summary = document.createElement('summary');
        summary.className = 'tweaks-section-title';
        const about = document.createElement('p');
        about.className = 'tweaks-section-about';
        const list = document.createElement('div');
        details.append(summary, about, list);
        body.prepend(details);                           // first in the pane

        // Shows a row for each of these projects
        const fill = (slugs) => {
            featuredRows.clear();
            list.replaceChildren(...works.filter((work) => slugs.includes(work.slug)).map(featuredRow));
        };

        if (page === 'work') {
            summary.textContent = 'Index: Featured projects';
            about.textContent = 'Which projects show in the Home page works grid. Save writes them to projects.json.';
            fill(works.map((work) => work.slug));
        } else {
            summary.textContent = 'Project: Featured';
            about.textContent = 'Whether the project on screen shows in the Home page works grid. Save writes it to projects.json.';
            fill([new URLSearchParams(location.search).get('slug')]);
            // project.js announces the project on screen as you scroll from one to the next
            document.addEventListener('project:change', (e) => fill([e.detail.slug]));
        }
        updateSaveLabel();
    }

    buildFeatured();
    document.body.appendChild(pane);

    // ---------- 5. Buttons ----------
    function flash(button, text) {
        const original = button.textContent;
        button.textContent = text;
        setTimeout(() => {
            button.textContent = original;
            updateSaveLabel();                           // the Save count may have changed meanwhile
        }, 1200);
    }

    // Sends the unsaved values to tweaks-server.js, which writes them into style.css :root
    async function saveToFile(button) {
        const values = { ...unsaved };
        const featured = { ...unsavedFeatured };
        if (Object.keys(values).length + Object.keys(featured).length === 0) return flash(button, 'All saved');
        button.disabled = true;
        try {
            const response = await fetch(SAVE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values, featured }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            // Those values are in the file now: they're the new baseline, and their rows turn black
            Object.entries(values).forEach(([name, value]) => {
                fileValues[name] = value;
                if (unsaved[name] === value) delete unsaved[name];   // unless you changed it again mid-save
            });
            save(STORE_VALUES, unsaved);
            CONTROLS.forEach(markRow);

            Object.entries(featured).forEach(([slug, on]) => {
                fileFeatured[slug] = on;
                if (unsavedFeatured[slug] === on) delete unsavedFeatured[slug];
                markFeatured(slug);
            });
            save(STORE_FEATURED, unsavedFeatured);
            flash(button, 'Saved ✓');
        } catch (error) {
            const offline = error instanceof TypeError;      // fetch failed = the helper isn't running
            console.warn(offline
                ? '[tweaks] Save needs the helper: stop the server and run `npm run dev` again.'
                : `[tweaks] Save failed: ${error.message}`);
            flash(button, offline ? 'Helper off' : 'Save failed');
        } finally {
            button.disabled = false;
        }
    }

    pane.querySelector('.tweaks-actions').addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        if (button.dataset.action === 'save') saveToFile(button);

        if (button.dataset.action === 'replay') {
            ALL_PARTS.forEach(replay);
        }

        // Reset = throw away unsaved changes and go back to what the files say
        if (button.dataset.action === 'reset') {
            CONTROLS.forEach((control) => {
                setValue(control, fileValues[control.variable]);
                control.sync(fileValues[control.variable]);
            });
            Object.keys(unsavedFeatured).forEach((slug) => {
                delete unsavedFeatured[slug];
                markFeatured(slug);
            });
            save(STORE_FEATURED, unsavedFeatured);
            updateSaveLabel();
            scheduleReplay('all');
            flash(button, 'Reset');
        }
    });

    // ---------- 6. Shift+T shortcut ----------
    // Hides the pane (values stay applied) so you can watch the page clean, and shows it again.
    pane.hidden = load(STORE_HIDDEN, false);

    document.addEventListener('keydown', (e) => {
        if (!e.shiftKey || e.key.toLowerCase() !== 't' || e.metaKey || e.ctrlKey || e.altKey) return;
        const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
        if (typing && !pane.contains(typing)) return;    // don't steal a capital T from forms
        e.preventDefault();
        pane.hidden = !pane.hidden;
        save(STORE_HIDDEN, pane.hidden);
    });
})();
