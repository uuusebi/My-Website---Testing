/* ============================================================
   project.js: the in-depth page for one project
   project.html?slug=dynama  →  finds "dynama" in projects.json and builds the page.
   1. Settings   2. Helpers   3. Audio   4. Build the page
   ============================================================ */

// ---------- 1. Settings you can tweak ----------
const AUDIO_VOLUME = 0.4;         // 0 to 1
const FADE_MS = 800;              // how long the audio fade in / out takes

const page = document.querySelector('.project-page');

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

// A <video> for .mp4 files, an <img> for everything else (same rule as the lightbox)
function mediaHTML(path, alt) {
    if (path.toLowerCase().endsWith('.mp4')) {
        return `<video src="${mediaSrc(path)}" controls autoplay muted loop playsinline></video>`;
    }
    return `<img src="${mediaSrc(path)}" alt="${escapeHTML(alt)}">`;
}

// Shown when the slug is missing, unknown, or projects.json can't load
function showMessage(text) {
    page.innerHTML = `
        <div class="project-missing">
            <p>${escapeHTML(text)}</p>
            <a href="work.html">← All work</a>
        </div>
    `;
}

// ---------- 3. Audio ----------
// Browsers block sound that starts by itself, so the track only plays after a click.

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

function setupAudioButton(button, src) {
    const audio = new Audio(encodeURI(src));
    audio.loop = true;
    audio.volume = 0;

    button.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => fadeTo(audio, AUDIO_VOLUME));    // start silent, then fade up
            button.textContent = '❚❚ Pause track';
        } else {
            fadeTo(audio, 0, () => audio.pause());                   // fade out, then stop
            button.textContent = '▶ Play track';
        }
    });
}

// ---------- 4. Build the page from projects.json ----------
async function loadProject() {
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) {
        showMessage('No project was chosen.');
        return;
    }

    let works;
    try {
        const response = await fetch('projects.json');
        works = await response.json();
    } catch (error) {
        console.error('Could not load projects.json:', error);
        showMessage(location.protocol === 'file:'
            ? 'This page was opened as a file. Open it with the dev server so projects.json can load.'
            : 'The project could not be loaded. Please refresh the page.');
        return;
    }

    // Same filter and order as the Work grid, so Previous / Next match what people saw there
    const live = works
        .filter((work) => work.status === 'live')
        .sort((a, b) => a.count - b.count);

    const index = live.findIndex((work) => work.slug === slug);
    if (index === -1) {
        showMessage('That project could not be found.');
        return;
    }

    const work = live[index];
    const prev = live[index - 1];
    const next = live[index + 1];
    document.title = `${work.title} | Sebastian Nunez`;

    const main = work.video || work.image;
    const gallery = (work.gallery || [])
        .map((path) => `<figure>${mediaHTML(path, work.title)}</figure>`)
        .join('');

    page.innerHTML = `
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

        <nav class="project-nav">
            ${prev ? `<a href="project.html?slug=${encodeURIComponent(prev.slug)}">← ${escapeHTML(prev.title)}</a>` : '<span></span>'}
            <a href="work.html">All work</a>
            ${next ? `<a href="project.html?slug=${encodeURIComponent(next.slug)}">${escapeHTML(next.title)} →</a>` : '<span></span>'}
        </nav>
    `;

    if (work.audio) setupAudioButton(page.querySelector('.project-audio'), work.audio);
}

loadProject();
