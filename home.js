/* ============================================================
   home.js: the Home page, played as one sequence
   01 intro (hero) → 02 services → 03 selected work
   1. Settings + helpers   2. Services   3. Works grid
   4. Stage sequence       5. Skip ahead   6. Start
   ============================================================ */

// ---------- 1. Settings + helpers ----------
// The real timings live in style.css :root (--stage-fade, --intro-hold, --service-hold).
// These numbers are only fallbacks.
const STAGE_FADE = 900;           // ms one stage takes to fade out (and the next to fade in)
const INTRO_HOLD = 1200;          // ms the intro stays after it finishes typing
const SERVICE_HOLD = 2200;        // ms each service stays highlighted
const SKIP_LOCK = 400;            // ms after a stage change when skipping is ignored (one scroll = one stage)

// People who turn off animations get a plain scrolling page and still previews
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reads a number from a CSS variable in style.css :root (the tweak pane can change these)
function cssNumber(name, fallback) {
    const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
}

// Makes text safe to place inside HTML (a title with a quote mark can't break the page)
function escapeHTML(text = '') {
    return String(text).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- 2. Services ----------

// The preview for one service: a muted looping video for .mp4 files, an image for anything else.
function previewMedia(path) {
    if (!path) return '';                                        // no preview: only the description shows
    const src = escapeHTML(encodeURI(path));
    if (path.toLowerCase().endsWith('.mp4')) {
        const play = reduceMotion ? '' : 'autoplay';             // muted + playsinline allow autoplay
        return `<video src="${src}" ${play} muted loop playsinline preload="metadata"></video>`;
    }
    return `<img src="${src}" alt="" loading="lazy">`;
}

// Builds one <li> per service. style.css shows the active one (black title + its preview).
function buildServices(services = []) {
    const list = document.getElementById('service-list');

    services.forEach((service) => {
        const item = document.createElement('li');
        item.className = 'service';
        item.tabIndex = 0;                                       // lets keyboard users tab through the titles
        item.innerHTML = `
            <h3>${escapeHTML(service.name)}</h3>
            <div class="service-preview">
                ${previewMedia(service.preview)}
                <p>${escapeHTML(service.description)}</p>
            </div>
        `;
        list.appendChild(item);
    });
}

// ---------- 3. Works grid ----------
// Every image of every featured project, in a loose grid with some empty cells
// (like a contact sheet). Hovering an image keeps its project sharp and blurs the rest.

// Leaves roughly a quarter of the cells empty, in a fixed pattern that looks scattered
function isEmptyCell(i) {
    return (i * 37) % 11 < 3;
}

function buildWorks(works) {
    const grid = document.getElementById('home-works-grid');

    // The title + number that follow the cursor
    const label = document.createElement('p');
    label.className = 'home-works-label';
    label.setAttribute('aria-hidden', 'true');
    document.body.appendChild(label);

    document.addEventListener('pointermove', (e) => {
        label.style.left = e.clientX + 'px';
        label.style.top = e.clientY + 'px';
    });

    let cell = 0;
    works.forEach((work) => {
        const images = [work.image, ...(work.gallery || [])]
            .filter((path) => path && !path.toLowerCase().endsWith('.mp4'));

        images.forEach((path) => {
            while (isEmptyCell(cell)) {                          // a gap or two before some images
                const empty = document.createElement('div');
                empty.className = 'home-works-empty';
                grid.appendChild(empty);
                cell++;
            }

            const item = document.createElement('a');
            item.href = `project.html?slug=${encodeURIComponent(work.slug)}`;
            item.className = 'home-works-item';
            item.dataset.slug = work.slug;
            item.innerHTML = `
                <img src="${escapeHTML(encodeURI(path))}" alt="${escapeHTML(work.title)}" loading="lazy">
                <span class="home-works-caption">${escapeHTML(work.title)}</span>
            `;

            item.addEventListener('pointerenter', (e) => {
                if (e.pointerType !== 'mouse') return;           // touch: no blur, captions show instead
                grid.dataset.active = work.slug;
                grid.querySelectorAll('.home-works-item').forEach((other) => {
                    other.classList.toggle('is-active', other.dataset.slug === work.slug);
                });
                label.innerHTML = `${escapeHTML(work.title)} <span class="home-works-label-count">(${String(work.count).padStart(2, '0')})</span>`;
                label.classList.add('show');
            });

            grid.appendChild(item);
            cell++;
        });
    });

    // Leaving the grid: everything sharp again
    grid.addEventListener('pointerleave', () => {
        delete grid.dataset.active;
        label.classList.remove('show');
    });
}

// ---------- 4. Stage sequence ----------
const stages = [...document.querySelectorAll('.home-stage')];
const serviceList = document.getElementById('service-list');
const progress = document.getElementById('home-progress');

let stage = -1;                   // which stage is showing
let busy = false;                 // true while stages are swapping (or just swapped)
let timer = null;                 // the countdown to the next stage
let serviceTimer = null;          // the countdown to the next service
let introDone = false;            // the hero has finished typing

async function goTo(next, fade = true) {
    if (busy || next <= stage || next >= stages.length) return;
    busy = true;
    clearTimeout(timer);
    clearTimeout(serviceTimer);

    // Old stage: fade out through blur, then hide it
    const from = stages[stage];
    if (from) {
        if (fade) {
            from.classList.add('home-stage-out');
            await wait(cssNumber('--stage-fade', STAGE_FADE));
        }
        from.hidden = true;
        from.classList.remove('home-stage-out');
    }

    // New stage: show it and fade it in
    stage = next;
    const to = stages[stage];
    to.hidden = false;
    window.scrollTo(0, 0);
    to.classList.remove('home-stage-in');
    void to.offsetWidth;                                         // restarts the animation
    if (fade) to.classList.add('home-stage-in');

    progress.textContent = `0${stage + 1} / 0${stages.length}`;
    const last = stage === stages.length - 1;
    document.documentElement.classList.toggle('home-locked', !last);   // only the last stage scrolls
    progress.classList.toggle('done', last);

    onEnter(stage);
    setTimeout(() => { busy = false; }, SKIP_LOCK);
}

// What each stage does once it's showing
function onEnter(i) {
    if (i === 0 && introDone) {
        timer = setTimeout(() => goTo(1), cssNumber('--intro-hold', INTRO_HOLD));
    }
    if (i === 1) playServices();
}

// hero.js says the intro finished typing: hold a moment, then move on
document.addEventListener('hero:done', () => {
    introDone = true;
    if (stage === 0) timer = setTimeout(() => goTo(1), cssNumber('--intro-hold', INTRO_HOLD));
});

// Highlights each service in turn, then moves on to the works
function playServices() {
    const items = [...serviceList.querySelectorAll('.service')];
    if (items.length === 0) return goTo(2);

    serviceList.classList.add('service-list-auto');
    let i = 0;
    const show = () => {
        items.forEach((item, n) => item.classList.toggle('active', n === i));
        serviceTimer = setTimeout(() => {
            i++;
            if (i < items.length) show();
            else goTo(2);
        }, cssNumber('--service-hold', SERVICE_HOLD));
    };
    show();

    // Hovering a service jumps the highlight to it (and the countdown starts over from there)
    items.forEach((item, n) => {
        item.onpointerenter = () => {
            if (stage !== 1) return;
            clearTimeout(serviceTimer);
            i = n;
            show();
        };
    });
}

// Back to the start (the tweak pane's replay)
function restart() {
    clearTimeout(timer);
    clearTimeout(serviceTimer);
    stages.forEach((s, n) => {
        s.hidden = n !== 0;
        s.classList.remove('home-stage-out', 'home-stage-in');
    });
    stage = -1;
    busy = false;
    introDone = false;
    goTo(0, false);
}

// ---------- 5. Skip ahead ----------
// Scroll down, click, swipe up, or press ↓ / Space / Page Down → the next stage.
// Never from inside the dev tweak pane.
function skip(e) {
    if (reduceMotion || stage >= stages.length - 1) return;
    if (e.target.closest && e.target.closest('.tweaks')) return;
    goTo(stage + 1);
}

window.addEventListener('wheel', (e) => { if (e.deltaY > 10) skip(e); }, { passive: true });
window.addEventListener('click', (e) => { if (!e.target.closest('a')) skip(e); });
window.addEventListener('keydown', (e) => {
    if (['ArrowDown', ' ', 'PageDown'].includes(e.key) && stage < stages.length - 1) {
        if (e.target.closest('.tweaks, input, textarea, select')) return;
        e.preventDefault();                                      // Space would otherwise try to scroll
        skip(e);
    }
});

let touchY = null;
window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchend', (e) => {
    if (touchY !== null && touchY - e.changedTouches[0].clientY > 40) skip(e);   // swiped up
    touchY = null;
});

// The tweak pane replays the hero: start the whole sequence again
document.addEventListener('tweaks:replay', (e) => {
    if (e.detail.part === 'hero' && !reduceMotion) restart();
});

// ---------- 6. Start ----------
async function loadHome() {
    // site.json: services + the contact line
    try {
        const site = await (await fetch('site.json')).json();
        buildServices(site.services);
        if (site.location) document.getElementById('cta-location').textContent = site.location.join(' ');
    } catch (error) {
        console.error('Could not load site.json:', error);
    }
    if (!serviceList.children.length) {
        const services = serviceList.closest('.services');
        services.classList.remove('home-stage');                 // no services: the sequence skips it
        services.hidden = true;
        stages.splice(stages.indexOf(services), 1);
    }

    // projects.json: the featured works
    try {
        const works = (await (await fetch('projects.json')).json())
            .filter((work) => work.status === 'live' && work.featured === true)
            .sort((a, b) => a.count - b.count);
        buildWorks(works);
    } catch (error) {
        console.error('Could not load projects.json:', error);
    }
}

if (reduceMotion) {
    loadHome();                                                  // everything shows, stacked, no sequence
} else {
    document.documentElement.classList.add('home-sequence');
    stages.forEach((s, n) => { s.hidden = n !== 0; });           // only the intro to begin with
    goTo(0, false);
    loadHome();
}
