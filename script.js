/* ============================================================
   script.js: the Work page
   1. Settings   2. Helpers   3. Description typing
   4. Preview (stage + description + list highlight)
   5. Filter     6. Build the page from projects.json
   Hover a thumbnail or a title (mouse only) → preview it on the page.
   Click or tap → project.html?slug=… (thumbnails and titles are plain links).
   ============================================================ */

// ---------- 1. Settings you can tweak ----------
const TYPING_REST_DELAY = 300;    // ms the cursor must rest on a project before its description types
const TYPING_MAX_MS = 1500;       // every description finishes typing within this time, however long
const TYPING_SPEED = 30;          // ms per character for short descriptions (lower = faster)

// ---------- Elements from work.html ----------
const workTitle = document.getElementById('work-title');
const workMeta = document.getElementById('work-meta');
const workCaption = document.getElementById('work-caption');
const workList = document.getElementById('work-list');
const workFilter = document.getElementById('work-filter');
const workGrid = document.getElementById('work-grid');
const stageLink = document.getElementById('stage-link');
const stageImg = document.getElementById('stage-img');
const stageVideo = document.getElementById('stage-video');

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
    workCaption.classList.remove('typing');
}

function typeText(work) {
    const text = work.description;
    const duration = Math.min(text.length * TYPING_SPEED, TYPING_MAX_MS);
    const start = performance.now();
    workCaption.classList.add('typing');

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);     // 0 → 1
        workCaption.textContent = text.slice(0, Math.ceil(progress * text.length));
        if (progress < 1) {
            typingFrame = requestAnimationFrame(step);
        } else {
            workCaption.classList.remove('typing');                  // done, so hide the cursor
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

    workTitle.textContent = work.title;
    workMeta.textContent = [work.client, work.category, work.date].filter(Boolean).join(' · ');

    // Underline this project's title in the list
    workList.querySelectorAll('a').forEach((link) => {
        link.classList.toggle('active', link.dataset.slug === work.slug);
    });

    // Description: instant if already read, otherwise wait for the cursor to rest, then type
    stopTyping();
    const text = work.description || '';
    if (instant || !text || seenDescriptions.has(work.slug)) {
        workCaption.textContent = text;
        if (instant && text) seenDescriptions.add(work.slug);
    } else {
        workCaption.textContent = '';
        workCaption.classList.add('typing');                         // blinking cursor while waiting
        restTimer = setTimeout(() => typeText(work), TYPING_REST_DELAY);
    }
}

// Hover (mouse) or keyboard focus on a link previews it. Touch is ignored, so a tap just opens the page.
function previewOnHover(el, work, mediaPath) {
    el.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse') preview(work, mediaPath);
    });
    el.addEventListener('focus', () => preview(work, mediaPath));
}

// ---------- 5. Filter ----------
function applyFilter(category) {
    // Underline the chosen filter
    workFilter.querySelectorAll('button').forEach((button) => {
        button.classList.toggle('active', button.dataset.category === category);
    });

    // Fade out (and disable) everything that doesn't match. "" means All.
    document.querySelectorAll('.work [data-category]:not(button)').forEach((el) => {
        el.classList.toggle('dimmed', category !== '' && el.dataset.category !== category);
    });
}

function buildFilter(works) {
    const categories = [...new Set(works.map((work) => work.category).filter(Boolean))];

    ['', ...categories].forEach((category) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.category = category;
        button.textContent = category || 'All';
        button.addEventListener('click', () => applyFilter(category));
        item.appendChild(button);
        workFilter.appendChild(item);
    });

    applyFilter('');                                                 // start with All selected
}

// ---------- 6. Build the page from projects.json ----------
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
            link.dataset.category = work.category || '';
            item.appendChild(link);
            workList.appendChild(item);

            if (work.image) previewOnHover(link, work, work.video || work.image);

            // Thumbnails: the cover plus every gallery image (videos are skipped as thumbnails)
            const images = [work.image, ...(work.gallery || [])]
                .filter((path) => path && !path.toLowerCase().endsWith('.mp4'));

            images.forEach((path, i) => {
                const thumb = document.createElement('a');
                thumb.href = projectUrl(work);
                thumb.className = 'thumb';
                thumb.dataset.category = work.category || '';
                thumb.style.setProperty('--i', thumbIndex++);       // staggers the fade-in
                thumb.innerHTML = `<img src="${escapeHTML(encodeURI(path))}" alt="${escapeHTML(work.title)}" loading="lazy">`;
                workGrid.appendChild(thumb);

                // The cover thumbnail previews the project's video if it has one
                previewOnHover(thumb, work, i === 0 ? (work.video || path) : path);
            });
        });

        buildFilter(works);

        // Start with the first project on the stage, so the page isn't empty before any hover
        const first = works.find((work) => work.image);
        if (first) preview(first, first.video || first.image, true);
    } catch (error) {
        console.error('Could not load projects.json:', error);
        showLoadError();
    }
}

loadProjects();
