/* ============================================================
   project.js: the in-depth project pages, as one endless scroll
   project.html?slug=dynama  →  starts at "dynama" in projects.json.
   Scrolling past the end of a project brings in the next one (after the
   last project comes the first again). Each project pins in place and dims
   while the next one slides up over it.
   1. Settings   2. Helpers   3. Audio   4. Build one project
   5. Endless scroll   6. Handoff + the project on screen   7. Start
   ============================================================ */

// ---------- 1. Settings you can tweak ----------
const AUDIO_VOLUME = 0.4;         // 0 to 1
const FADE_MS = 800;              // how long the audio fade in / out takes
// The handoff look (scale and dim) is in style.css :root: --project-cover-scale, --project-cover-dim

const page = document.querySelector('.project-page');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let live = [];                    // live projects, in the same order as the Index
let nextIndex = 0;                // which project in `live` gets added next
let current = null;               // the <article> on screen right now

// ---------- 2. Helpers ----------

// Makes text safe to place inside HTML (a title with a quote mark can't break the page)
function escapeHTML(text = '') {
    return String(text).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Paths can contain spaces ("getting killed"), so encode them before using them as a src
function mediaSrc(path) {
    return escapeHTML(encodeURI(path));
}

// A <video> for .mp4 files, an <img> for everything else
function mediaHTML(path, alt) {
    if (path.toLowerCase().endsWith('.mp4')) {
        return `<video src="${mediaSrc(path)}" controls autoplay muted loop playsinline></video>`;
    }
    return `<img src="${mediaSrc(path)}" alt="${escapeHTML(alt)}">`;
}

function projectUrl(work) {
    return `project.html?slug=${encodeURIComponent(work.slug)}`;
}

// Shown when the slug is missing, unknown, or projects.json can't load
function showMessage(text) {
    page.innerHTML = `
        <div class="project-missing">
            <p>${escapeHTML(text)}</p>
            <a href="work.html">← Index</a>
        </div>
    `;
}

// ---------- 3. Audio ----------
// Browsers block sound that starts by itself, so a track only plays after a click.

// Slowly moves an audio element's volume to a target, then runs onDone
function fadeTo(audio, target, onDone) {
    clearInterval(audio.fadeTimer);
    const step = (target - audio.volume) / (FADE_MS / 50);       // volume change per 50ms tick
    audio.fadeTimer = setInterval(() => {
        const next = audio.volume + step;
        const reached = step > 0 ? next >= target : next <= target;
        if (reached) {
            audio.volume = target;
            clearInterval(audio.fadeTimer);
            if (onDone) onDone();
        } else {
            audio.volume = next;
        }
    }, 50);
}

function setupAudioButton(article, src) {
    const button = article.querySelector('.project-audio');
    const audio = new Audio(encodeURI(src));
    audio.loop = true;
    audio.volume = 0;

    const stop = () => {
        fadeTo(audio, 0, () => audio.pause());                   // fade out, then stop
        button.textContent = '▶ Play track';
    };

    button.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => fadeTo(audio, AUDIO_VOLUME));    // start silent, then fade up
            button.textContent = '❚❚ Pause track';
        } else {
            stop();
        }
    });

    // Section 6 calls this when the project scrolls away
    article.stopAudio = () => { if (!audio.paused) stop(); };
}

// ---------- 4. Build one project ----------
// Returns an <article class="project"> with the project's title, media, text,
// gallery, and a small Contact button at the end.
function buildProject(work) {
    const article = document.createElement('article');
    article.className = 'project';
    article.dataset.slug = work.slug;

    const main = work.video || work.image;
    const gallery = (work.gallery || [])
        .map((path) => `<figure>${mediaHTML(path, work.title)}</figure>`)
        .join('');
    const next = live[(live.indexOf(work) + 1) % live.length];

    article.innerHTML = `
        <header class="project-head">
            <h1>${escapeHTML(work.title)}</h1>
            <dl class="project-meta">
                <div><dt>Client</dt><dd>${escapeHTML(work.client)}</dd></div>
                <div><dt>Type</dt><dd>${escapeHTML(work.category)}</dd></div>
                <div><dt>Date</dt><dd>${escapeHTML(work.date)}</dd></div>
            </dl>
        </header>

        ${main ? `<div class="project-hero-media">${mediaHTML(main, work.title)}</div>` : ''}

        <section class="project-body">
            ${work.description ? `<p>${escapeHTML(work.description)}</p>` : ''}
            ${work.audio ? `<button class="project-audio" type="button">▶ Play track</button>` : ''}
        </section>

        ${gallery ? `<section class="project-gallery">${gallery}</section>` : ''}

        <footer class="project-end">
            <span class="project-end-next">Next: ${escapeHTML(next.title)} ↓</span>
            <a href="contact.html" class="project-contact">Contact →</a>
        </footer>
    `;

    if (work.audio) setupAudioButton(article, work.audio);
    return article;
}

// ---------- 5. Endless scroll ----------
// An invisible marker sits after the last project. When it comes near the screen,
// the next project is added before it. After the last project, it loops to the first.
const sentinel = document.createElement('div');
sentinel.className = 'project-sentinel';
sentinel.setAttribute('aria-hidden', 'true');

function appendNext() {
    const article = buildProject(live[nextIndex]);
    nextIndex = (nextIndex + 1) % live.length;
    page.insertBefore(article, sentinel);
    watchHeight(article);
    return article;
}

const nearEnd = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    appendNext();
    // Watch the marker again: if it's still close (a short project), this fires once more
    nearEnd.unobserve(sentinel);
    nearEnd.observe(sentinel);
}, { rootMargin: '0px 0px 100% 0px' });                         // "near" = within one screen below

// ---------- 6. Handoff + the project on screen ----------
// Each project is position: sticky. Its --project-stick offset makes it pin when its
// BOTTOM reaches the bottom of the screen, so the next project slides up over it.
// Heights change as images load, so a ResizeObserver keeps the offset right.
const heights = new ResizeObserver((entries) => {
    entries.forEach(({ target }) => {
        target.style.setProperty('--project-stick', `${Math.min(window.innerHeight - target.offsetHeight, 0)}px`);
    });
    updateScroll();
});

function watchHeight(article) {
    if (!reduceMotion) heights.observe(article);
}

window.addEventListener('resize', () => {
    page.querySelectorAll('.project').forEach((article) => {
        article.style.setProperty('--project-stick', `${Math.min(window.innerHeight - article.offsetHeight, 0)}px`);
    });
});

// Runs once per frame while scrolling
let ticking = false;

function updateScroll() {
    const articles = [...page.querySelectorAll('.project')];
    const h = window.innerHeight;

    articles.forEach((article, i) => {
        const next = articles[i + 1];
        const nextTop = next ? next.getBoundingClientRect().top : h;

        // How far the next project has slid over this one: 0 (not yet) → 1 (fully)
        const cover = Math.min(Math.max((h - nextTop) / h, 0), 1);
        article.style.setProperty('--project-cover', cover.toFixed(3));

        // Completely hidden under the next one: skip drawing it (saves work as the list grows)
        article.classList.toggle('project-hidden', next !== undefined && nextTop <= 0);
    });

    // The project on screen = the last one whose top has passed the middle of the screen
    const onScreen = articles.filter((article) => article.getBoundingClientRect().top <= h / 2).pop() || articles[0];
    if (onScreen && onScreen !== current) {
        if (current && current.stopAudio) current.stopAudio();   // its song fades out as it leaves
        current = onScreen;
        const work = live.find((w) => w.slug === current.dataset.slug);
        document.title = `${work.title} | Sebastian Nunez`;
        history.replaceState(null, '', projectUrl(work));        // the address bar follows along
        document.dispatchEvent(new CustomEvent('project:change', { detail: { slug: work.slug } }));
    }
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(updateScroll);
        ticking = true;
    }
}, { passive: true });

// ---------- 7. Start: load projects.json and show the first project ----------
async function loadProject() {
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) {
        showMessage('No project was chosen.');
        return;
    }

    try {
        const response = await fetch('projects.json');
        live = (await response.json())
            .filter((work) => work.status === 'live')               // same filter and order as the Index
            .sort((a, b) => a.count - b.count);
    } catch (error) {
        console.error('Could not load projects.json:', error);
        showMessage(location.protocol === 'file:'
            ? 'This page was opened as a file. Open it with the dev server so projects.json can load.'
            : 'The project could not be loaded. Please refresh the page.');
        return;
    }

    const index = live.findIndex((work) => work.slug === slug);
    if (index === -1) {
        showMessage('That project could not be found.');
        return;
    }

    nextIndex = index;
    page.appendChild(sentinel);
    appendNext();
    updateScroll();
    nearEnd.observe(sentinel);
}

loadProject();
