/* ============================================================
   script.js: the Index page (work.html), every project in two views
   1. Settings   2. Helpers   3. Description typing
   4. Preview (stage + description + list highlight)
   5. Filter     6. View (Gallery / List)   7. List rows + cursor preview
   8. Build the page from projects.json
   Gallery: hover a thumbnail or a title (mouse only) → preview it on the page.
   List: hover a row → its image follows the cursor.
   Click or tap → project.html?slug=… (thumbnails, titles and rows are plain links).
   ============================================================ */

// ---------- 1. Settings you can tweak ----------
const TYPING_REST_DELAY = 300;    // ms the cursor must rest on a project before its description types
const TYPING_MAX_MS = 1500;       // every description finishes typing within this time, however long
const TYPING_SPEED = 30;          // ms per character for short descriptions (lower = faster)
// The real values live in style.css :root (--work-typing-*). These numbers are only fallbacks.

// Reads a number from a CSS variable in style.css :root (the tweak pane can change these).
// Falls back to the number given if the variable is missing.
function cssNumber(name, fallback) {
    const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
}

// The filter buttons come from "services" in site.json (the same list as the Home page).
// A project joins a filter by listing the service's name in its "services" array in projects.json.

// ---------- Elements from work.html ----------
const workInfoTitle = document.getElementById('work-info-title');
const workInfoMeta = document.getElementById('work-info-meta');
const workInfoText = document.getElementById('work-info-text');
const workList = document.getElementById('work-list');
const workFilter = document.getElementById('work-filter');
const workGrid = document.getElementById('work-grid');
const stageLink = document.getElementById('stage-link');
const stageImg = document.getElementById('stage-img');
const stageVideo = document.getElementById('stage-video');
const workMain = document.getElementById('work');
const workView = document.getElementById('work-view');
const workRows = document.getElementById('work-rows');

// ---------- State (values that change while the page is in use) ----------
const seenDescriptions = new Set();   // projects whose description has fully typed once (shown instantly after)
let currentWork = null;               // the project being previewed
let currentMedia = null;              // the exact file on the stage
let restTimer = null;                 // countdown before typing starts
let typingFrame = null;               // the running typing animation

// ---------- 2. Helpers ----------

// Makes text safe to place inside HTML (a title with a quote mark can't break the page)
function escapeHTML(text = '') {
    return String(text).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function projectUrl(work) {
    return `project.html?slug=${encodeURIComponent(work.slug)}`;
}

// Shown if projects.json can't be loaded, so the page isn't just silently empty
function showLoadError() {
    const note = document.createElement('p');
    note.className = 'load-error';
    note.setAttribute('role', 'alert');
    note.textContent = location.protocol === 'file:'
        ? 'This page was opened as a file. Open it with Live Server (or your published site) so projects.json can load.'
        : 'The projects could not be loaded. Please refresh the page.';
    document.body.appendChild(note);
}

// ---------- 3. Description typing ----------
// Instead of a fixed speed per letter, typing is timed by the clock:
// each animation frame works out how many letters "should" be showing by now.
// That way a long description still finishes within TYPING_MAX_MS.

function stopTyping() {
    clearTimeout(restTimer);
    cancelAnimationFrame(typingFrame);
    workInfoText.classList.remove('typing');
}

function typeText(work) {
    const text = work.description;
    const duration = Math.min(
        text.length * cssNumber('--work-typing-speed', TYPING_SPEED),
        cssNumber('--work-typing-max', TYPING_MAX_MS)
    );
    const start = performance.now();
    workInfoText.classList.add('typing');

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);     // 0 → 1
        workInfoText.textContent = text.slice(0, Math.ceil(progress * text.length));
        if (progress < 1) {
            typingFrame = requestAnimationFrame(step);
        } else {
            workInfoText.classList.remove('typing');                  // done, so hide the cursor
            seenDescriptions.add(work.slug);                         // only counts as "seen" once it fully typed
        }
    }

    typingFrame = requestAnimationFrame(step);
}

// ---------- 4. Preview ----------

// Puts an image or video on the stage. The image swaps right away (that's what
// makes sweeping across thumbnails feel quick); it fades in once the file has loaded.
function showMedia(path, work) {
    if (path === currentMedia) return;
    currentMedia = path;
    stageLink.href = projectUrl(work);

    if (path.toLowerCase().endsWith('.mp4')) {
        stageImg.hidden = true;
        stageVideo.hidden = false;
        stageVideo.src = encodeURI(path);                            // encodeURI makes spaces in the path safe
        stageVideo.play().catch(() => {});                           // muted video is allowed to autoplay
    } else {
        stageVideo.pause();
        stageVideo.removeAttribute('src');
        stageVideo.hidden = true;
        stageImg.hidden = false;
        stageImg.alt = work.title;

        // Only fade if the file actually changes (re-setting the same src may never fire "load")
        const src = encodeURI(path);
        if (stageImg.getAttribute('src') !== src) {
            stageImg.classList.add('loading');
            stageImg.src = src;
        }
    }
}

// Fade the image in once it has loaded (or straight away if the browser already had it)
stageImg.addEventListener('load', () => stageImg.classList.remove('loading'));

// Updates the stage, the description, and the underline in the list.
// `instant` skips typing (used for the first project shown when the page loads).
function preview(work, mediaPath, instant = false) {
    showMedia(mediaPath, work);
    if (work === currentWork) return;                                // another image of the same project: keep the text
    currentWork = work;

    workInfoTitle.textContent = work.title;
    workInfoMeta.textContent = [work.client, work.category, work.date].filter(Boolean).join(' · ');

    // Underline this project's title in the list
    workList.querySelectorAll('a').forEach((link) => {
        link.classList.toggle('active', link.dataset.slug === work.slug);
    });

    // Description: instant if already read, otherwise wait for the cursor to rest, then type
    stopTyping();
    const text = work.description || '';
    if (instant || !text || seenDescriptions.has(work.slug)) {
        workInfoText.textContent = text;
        if (instant && text) seenDescriptions.add(work.slug);
    } else {
        workInfoText.textContent = '';
        workInfoText.classList.add('typing');                         // blinking cursor while waiting
        restTimer = setTimeout(() => typeText(work), cssNumber('--work-typing-delay', TYPING_REST_DELAY));
    }
}

// Replay (sent by the dev tweak pane, tweaks.js): retype the description on the stage
document.addEventListener('tweaks:replay', (e) => {
    if (e.detail.part !== 'work-typing' || !currentWork || !currentWork.description) return;
    stopTyping();
    workInfoText.textContent = '';
    typeText(currentWork);
});

// Hover (mouse) or keyboard focus on a link previews it. Touch is ignored, so a tap just opens the page.
function previewOnHover(el, work, mediaPath) {
    el.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse') preview(work, mediaPath);
    });
    el.addEventListener('focus', () => preview(work, mediaPath));
}

// ---------- 5. Filter ----------
// Titles and thumbnails carry their project's services as data-services="Graphic Design|Animation".
// "|" separates the names because a service name can contain spaces.
function servicesOf(el) {
    return el.dataset.services ? el.dataset.services.split('|') : [];
}

function applyFilter(service) {
    // Underline the chosen filter
    workFilter.querySelectorAll('button').forEach((button) => {
        button.classList.toggle('active', button.dataset.service === service);
    });

    // Fade out (and disable) everything that doesn't offer this service. "" means All.
    document.querySelectorAll('.work [data-services]').forEach((el) => {
        el.classList.toggle('dimmed', service !== '' && !servicesOf(el).includes(service));
    });
}

function buildFilter(works, serviceNames) {
    // Only show a service once at least one project uses it, so no button leads to an empty page
    const used = serviceNames.filter((service) =>
        works.some((work) => (work.services || []).includes(service))
    );

    ['', ...used].forEach((service) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.service = service;
        button.textContent = service || 'All';
        button.addEventListener('click', () => applyFilter(service));
        item.appendChild(button);
        workFilter.appendChild(item);
    });

    applyFilter('');                                                 // start with All selected
}

// The service names, in the order they're listed in site.json.
// If site.json can't load, fall back to the services the projects themselves use.
async function loadServiceNames(works) {
    try {
        const response = await fetch('site.json');
        const site = await response.json();
        return (site.services || []).map((service) => service.name);
    } catch (error) {
        console.error('Could not load site.json, building the filter from projects.json:', error);
        return [...new Set(works.flatMap((work) => work.services || []))];
    }
}

// ---------- 6. View (Gallery / List) ----------
// main.work has data-view="gallery" or "list"; style.css shows only that view.
// The choice is kept in the URL (?view=list) so a shared link opens the same view.
const VIEWS = ['gallery', 'list'];

function setView(view, animate = true) {
    if (!VIEWS.includes(view)) view = 'gallery';
    workMain.dataset.view = view;

    workView.querySelectorAll('button').forEach((button) => {
        button.classList.toggle('active', button.dataset.view === view);
    });

    // List view has no stage, so the big title just says Index
    workInfoTitle.textContent = view === 'list' || !currentWork ? 'Index' : currentWork.title;

    // Fade the new view in (style.css: .work-view-in)
    if (animate) {
        const shown = view === 'list' ? workRows : document.getElementById('work-gallery');
        shown.classList.remove('work-view-in');
        void shown.offsetWidth;                                      // restart the animation
        shown.classList.add('work-view-in');
    }

    const url = new URL(location.href);
    url.searchParams.set('view', view);
    history.replaceState(null, '', url);                            // changes the URL without reloading
}

workView.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) setView(button.dataset.view);
});

// ---------- 7. List rows + cursor preview ----------
// One shared preview image that follows the cursor while it's over a row
const rowsPreview = document.createElement('img');
rowsPreview.className = 'work-rows-preview';
rowsPreview.alt = '';
document.body.appendChild(rowsPreview);

document.addEventListener('pointermove', (e) => {
    rowsPreview.style.left = e.clientX + 'px';
    rowsPreview.style.top = e.clientY + 'px';
    // Flips to the left when the preview (plus its gap and some margin) wouldn't fit on the right
    const needed = cssNumber('--list-preview-size', 260) + cssNumber('--list-preview-offset', 24) * 2 + 52;
    rowsPreview.classList.toggle('flip', e.clientX > window.innerWidth - needed);
});

function buildRow(work) {
    const row = document.createElement('a');
    row.href = projectUrl(work);
    row.className = 'work-rows-row';
    row.dataset.services = (work.services || []).join('|');           // so the filter dims rows too

    // One <span> per column. textContent keeps odd characters in titles safe.
    [work.title, work.client, work.category, work.date].forEach((text) => {
        const cell = document.createElement('span');
        cell.textContent = text || '';
        row.appendChild(cell);
    });

    if (work.image) {
        row.addEventListener('pointerenter', (e) => {
            if (e.pointerType !== 'mouse') return;                   // no hover preview on touch screens
            rowsPreview.src = encodeURI(work.image);
            rowsPreview.classList.add('show');
        });
        row.addEventListener('pointerleave', () => rowsPreview.classList.remove('show'));
    }

    workRows.appendChild(row);
}

// ---------- 8. Build the page from projects.json ----------
async function loadProjects() {
    try {
        const response = await fetch('projects.json');
        const works = (await response.json())
            .filter((work) => work.status === 'live')               // drafts stay hidden
            .sort((a, b) => a.count - b.count);                     // order by the count field

        let thumbIndex = 0;

        works.forEach((work) => {
            // Title list: one link per project
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = projectUrl(work);
            link.textContent = work.title;
            link.dataset.slug = work.slug;
            link.dataset.services = (work.services || []).join('|');
            item.appendChild(link);
            workList.appendChild(item);

            if (work.image) previewOnHover(link, work, work.video || work.image);

            buildRow(work);                                          // the List view's row

            // Thumbnails: the cover plus every gallery image (videos are skipped as thumbnails)
            const images = [work.image, ...(work.gallery || [])]
                .filter((path) => path && !path.toLowerCase().endsWith('.mp4'));

            images.forEach((path, i) => {
                const thumb = document.createElement('a');
                thumb.href = projectUrl(work);
                thumb.className = 'thumb';
                thumb.dataset.services = (work.services || []).join('|');
                thumb.style.setProperty('--i', thumbIndex++);       // staggers the fade-in
                thumb.innerHTML = `<img src="${escapeHTML(encodeURI(path))}" alt="${escapeHTML(work.title)}" loading="lazy">`;
                workGrid.appendChild(thumb);

                // The cover thumbnail previews the project's video if it has one
                previewOnHover(thumb, work, i === 0 ? (work.video || path) : path);
            });
        });

        buildFilter(works, await loadServiceNames(works));

        // Start with the first project on the stage, so the page isn't empty before any hover
        const first = works.find((work) => work.image);
        if (first) preview(first, first.video || first.image, true);

        setView(new URLSearchParams(location.search).get('view'), false);   // the view from the URL, or Gallery
    } catch (error) {
        console.error('Could not load projects.json:', error);
        showLoadError();
    }
}

loadProjects();
