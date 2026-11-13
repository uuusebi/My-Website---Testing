/* ============================================================
   script.js: the home page
   1. Settings   2. Lightbox   3. Audio   4. Hover behavior
   5. Build the project cards from projects.json
   ============================================================ */

// ---------- 1. Settings you can tweak ----------
const HOVER_DELAY = 300;          // ms to hover a card before the lightbox opens
const LEAVE_CLOSE_DELAY = 400;    // ms after leaving the image before it closes (forgives small slips)
const TYPING_SPEED = 35;          // ms per character in the description (lower = faster)
const TYPING_START_DELAY = 700;   // ms to wait before typing starts, so the image can land first
const AUDIO_VOLUME = 0.4;         // 0 to 1
const FADE_MS = 800;              // how long the audio fade in / out takes

// ---------- Elements from index.html ----------
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxVideo = document.getElementById('lightbox-video');
const lightboxCaption = document.getElementById('lightbox-caption');
const metaTitle = document.getElementById('meta-title');
const metaType = document.getElementById('meta-type');
const metaDate = document.getElementById('meta-date');

// ---------- State (values that change while the page is in use) ----------
const seenLightboxes = new Set();   // which projects have already been opened (so the typing only plays once)
let hoverTimer = null;              // countdown before a hovered card opens
let leaveTimer = null;              // countdown before the lightbox closes after the cursor leaves
let typingTimer = null;             // countdown for the next typed letter
let lockedCard = null;              // stops an instant re-open after closing while still on the card
let lastOpenedCard = null;
let armedToClose = false;           // only true once the cursor has been over the image
let currentAudio = null;            // the song playing right now (if any)
let mouseX = 0;
let mouseY = 0;

// Track the cursor so we know if it's still on a card when the lightbox closes
document.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Is the cursor currently inside this card's rectangle?
function isOverCard(card) {
    if (!card) return false;
    const r = card.getBoundingClientRect();
    return mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom;
}

// Makes text safe to place inside HTML (a title with a quote mark can't break the page)
function escapeHTML(text = '') {
    return String(text).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ---------- 2. Lightbox ----------

// Types the description one letter at a time
function typeText(text) {
    let i = 0;
    lightboxCaption.textContent = '';
    lightboxCaption.classList.add('typing');

    function typeNextChar() {
        i++;
        lightboxCaption.textContent = text.slice(0, i);          // the first i characters
        if (i < text.length) {
            typingTimer = setTimeout(typeNextChar, TYPING_SPEED);
        } else {
            lightboxCaption.classList.remove('typing');          // done, so hide the cursor
        }
    }

    typingTimer = setTimeout(typeNextChar, TYPING_START_DELAY);
}

function openLightbox(imageSrc, descriptionText, audioSrc, meta = {}) {
    // Fill in the title / type / date bar at the top
    metaTitle.textContent = meta.title || '';
    metaType.textContent = meta.type || '';
    metaDate.textContent = meta.date || '';

    // Only attempts to load if there's a real image file name
   lightboxImg.style.display = 'none';
    lightboxVideo.style.display = 'none';
    lightboxVideo.pause();

    if (imageSrc) {
        if (imageSrc.toLowerCase().endsWith('.mp4')) {
            lightboxVideo.src = imageSrc;
            lightboxVideo.style.display = 'block';
            lightboxVideo.play();
        } else {
            lightboxImg.src = imageSrc;
            lightboxImg.style.display = 'block';
        }
    }

    // Stop any typing left over from a previous lightbox
    clearTimeout(typingTimer);
    lightboxCaption.classList.remove('typing');

    // Put the description into the popup
    if (descriptionText) {
        if (seenLightboxes.has(imageSrc)) {
            lightboxCaption.textContent = descriptionText;       // seen before: show instantly
        } else {
            seenLightboxes.add(imageSrc);                        // first time: remember it, then type it
            typeText(descriptionText);
        }
    } else {
        lightboxCaption.textContent = '';                        // no description: leave it blank
    }

    armedToClose = false;
    clearTimeout(leaveTimer);
    playAudio(audioSrc);

    // Double requestAnimationFrame so the browser registers the closed state first,
    // which lets the scale-up animation play
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            lightbox.classList.add('active');
            document.body.classList.add('lightbox-open');        // stops the page scrolling behind it
        });
    });
}

function closeLightbox() {
    stopAudio();
    clearTimeout(typingTimer);
    clearTimeout(leaveTimer);
    armedToClose = false;
    
    lightboxVideo.pause();
    lightboxVideo.removeAttribute('src');
    lightboxVideo.load();
    
    lightbox.classList.remove('active');
    document.body.classList.remove('lightbox-open');

    // If the cursor is still sitting on the card, lock it until the cursor leaves
    lockedCard = isOverCard(lastOpenedCard) ? lastOpenedCard : null;
}

// Press Esc to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

// Hover away from the image to close
[lightboxImg, lightboxVideo, lightboxCaption].forEach((el) => {

    el.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(leaveTimer);
        armedToClose = true;                                     // from now on, leaving the image closes the lightbox
    });

    el.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (!armedToClose) return;

        // Moving between the image and its caption shouldn't close it
        if (e.relatedTarget === lightboxImg || e.relatedTarget === lightboxVideo || e.relatedTarget === lightboxCaption) return;

        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(closeLightbox, LEAVE_CLOSE_DELAY);
    });
});

// ---------- 3. Audio ----------

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

function playAudio(src) {
    stopAudio(true);                                             // cut off any previous song
    if (!src) return;                                            // this project has no song

    currentAudio = new Audio(encodeURI(src));                    // encodeURI makes spaces in the path safe
    currentAudio.loop = true;
    currentAudio.volume = 0;                                     // start silent, then fade up
    currentAudio.play()
        .then(() => fadeTo(currentAudio, AUDIO_VOLUME))
        .catch((err) => console.log('Audio did not play:', err));   // browsers block sound until the page has been clicked
}

function stopAudio(immediate = false) {
    if (!currentAudio) return;
    const audio = currentAudio;
    currentAudio = null;
    if (immediate) {
        clearInterval(audio.fadeTimer);
        audio.pause();
    } else {
        fadeTo(audio, 0, () => audio.pause());                   // fade out, then stop
    }
}

// ---------- 4. Hover a card to open ----------
function setupCardHover() {
    document.querySelectorAll('.project-card').forEach((card) => {

        card.addEventListener('pointerenter', (e) => {
            if (e.pointerType !== 'mouse') return;               // ignore touch, so taps just click
            if (card === lockedCard) return;

            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => {
                lastOpenedCard = card;
                card.click();                                    // runs the card's click handler
            }, HOVER_DELAY);
        });

        card.addEventListener('pointerleave', () => {
            clearTimeout(hoverTimer);
            if (card === lockedCard) lockedCard = null;
        });

        // A manual click opens instantly, so cancel any pending hover timer
        card.addEventListener('click', () => {
            clearTimeout(hoverTimer);
            lastOpenedCard = card;
        });
    });
}

// ---------- 5. Build the cards from projects.json ----------

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

async function loadProjects() {
    const grid = document.querySelector('.portfolio-grid');

    try {
        const response = await fetch('projects.json');
        const works = await response.json();

        // Reveals each card the first time it scrolls into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);            // only animate once
                }
            });
        }, { threshold: 0.15 });

        works
            .filter((work) => work.status === 'live')           // drafts stay hidden
            .sort((a, b) => a.count - b.count)                  // order by the count field
            .forEach((work, index) => {
                const card = document.createElement('div');
                card.className = 'project-card reveal';
                card.style.setProperty('--i', index % 3);       // 0, 1, 2 across each row of three (staggers the reveal)

                // A real <img> if there's an image, a gray placeholder box if not
                const media = work.image
                    ? `<img src="${escapeHTML(work.image)}" class="project-image" alt="${escapeHTML(work.title)}">`
                    : `<div class="project-image"></div>`;

                card.innerHTML = `
                    ${media}
                    <div class="project-info">
                        <p>${escapeHTML(work.client)}</p>
                        <h3>${escapeHTML(work.title)}</h3>
                    </div>
                `;

                // Clicking a card (or hovering it long enough) opens the lightbox
                if (work.video || work.image) {
                    card.addEventListener('click', () => openLightbox(
                        work.video || work.image,
                        work.description,
                        work.audio,
                        { title: work.title, type: work.category, date: work.date }
                    ));
                }

                grid.appendChild(card);
                observer.observe(card);
            });

        setupCardHover();                                        // attach hover behavior now that the cards exist
    } catch (error) {
        console.error('Could not load projects.json:', error);
        showLoadError();
    }
}

loadProjects();
