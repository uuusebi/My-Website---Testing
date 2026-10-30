// JavaScript to handle opening portfolio items full-screen

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');

const HOVER_DELAY = 300; // ms to hover before the lightbox opens
const LEAVE_CLOSE_DELAY = 400;  // ms after leaving the image before it closes (forgives small slips)

const TYPING_SPEED = 35;        // ms per character (lower = faster)
const TYPING_START_DELAY = 700; // ms to wait before typing starts, so the image can land first
const seenLightboxes = new Set(); // remembers which projects have already been opened

const metaTitle = document.getElementById('meta-title');
const metaType = document.getElementById('meta-type');
const metaDate = document.getElementById('meta-date');

let hoverTimer = null;
let leaveTimer = null;

let lockedCard = null;          // stops instant re-open after closing while still on the card
let lastOpenedCard = null;
let armedToClose = false;       // only true once the cursor has been over the image
let mouseX = 0;

let mouseY = 0;

let typingTimer = null;

// Track the cursor so we know if it's still on a card when the lightbox closes
document.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
function isOverCard(card) {
    if (!card) return false;
    const r = card.getBoundingClientRect();
    return mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom;
}
function typeText(text) {
    let i = 0;
    lightboxCaption.textContent = "";
    lightboxCaption.classList.add('typing');

    function typeNextChar() {
        i++;
        lightboxCaption.textContent = text.slice(0, i); // first i characters
        if (i < text.length) {
            typingTimer = setTimeout(typeNextChar, TYPING_SPEED);
        } else {
            lightboxCaption.classList.remove('typing'); // done, so hide the cursor
        }
    }

    typingTimer = setTimeout(typeNextChar, TYPING_START_DELAY);
}
// ---------- Audio ----------
const AUDIO_VOLUME = 0.4; // 0 to 1
const FADE_MS = 800;      // how long the fade in / out takes
let currentAudio = null;  // the song playing right now (if any)

function fadeTo(audio, target, onDone) {
    clearInterval(audio.fadeTimer);
    const step = (target - audio.volume) / (FADE_MS / 50); // volume change per 50ms tick
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
    stopAudio(true);          // cut off any previous song
    if (!src) return;         // this project has no song

    currentAudio = new Audio(encodeURI(src)); // encodeURI makes the spaces in your path safe
    currentAudio.loop = true;
    currentAudio.volume = 0;  // start silent, then fade up
    currentAudio.play()
        .then(() => fadeTo(currentAudio, AUDIO_VOLUME))
        .catch((err) => console.log('Audio did not play:', err));
}

function stopAudio(immediate = false) {
    if (!currentAudio) return;
    const audio = currentAudio;
    currentAudio = null;
    if (immediate) {
        clearInterval(audio.fadeTimer);
        audio.pause();
    } else {
        fadeTo(audio, 0, () => audio.pause()); // fade out, then stop
    }
}
function openLightbox(imageSrc, descriptionText, audioSrc, meta = {}) {
    metaTitle.textContent = meta.title || '';
    metaType.textContent = meta.type || '';
    metaDate.textContent = meta.date || '';

    // Only attempts to load if you have a real image file name
    if (imageSrc && imageSrc !== '') {
        lightboxImg.src = imageSrc;
    }

      // Stop any typing left over from a previous lightbox
    clearTimeout(typingTimer);
    lightboxCaption.classList.remove('typing');

    // Inject the description text into the popup window
    if (descriptionText) {
        if (seenLightboxes.has(imageSrc)) {
            lightboxCaption.textContent = descriptionText; // seen before: show instantly
        } else {
            seenLightboxes.add(imageSrc);                  // first time: remember it, then type it
            typeText(descriptionText);
        }
    } else {
        lightboxCaption.textContent = "";
        // Leaves it blank if you don't provide a description
    }
   
        armedToClose = false;
    clearTimeout(leaveTimer);
    playAudio(audioSrc);   // NEW
    // Double requestAnimationFrame so the browser registers the closed state first,
    // which lets the scale-up animation play
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            lightbox.classList.add('active');
            document.body.classList.add('lightbox-open');
        });
    });
}

function closeLightbox() {
    stopAudio();           // NEW
    clearTimeout(typingTimer);
    clearTimeout(leaveTimer);
    armedToClose = false;
    lightbox.classList.remove('active');
    document.body.classList.remove('lightbox-open');

    // If the cursor is still sitting on the card, lock it until the cursor leaves
    lockedCard = isOverCard(lastOpenedCard) ? lastOpenedCard : null;
}

// Press Esc to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

// ---------- Hover away from the image to close ----------
[lightboxImg, lightboxCaption].forEach((el) => {

    el.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(leaveTimer);
        armedToClose = true; // from now on, leaving the image closes the lightbox
    });

    el.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (!armedToClose) return;

        // Moving between the image and its caption shouldn't close it
        if (e.relatedTarget === lightboxImg || e.relatedTarget === lightboxCaption) return;

        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(closeLightbox, LEAVE_CLOSE_DELAY);
    });
});

// ---------- Hover a card to open ----------
function setupCardHover() {
    document.querySelectorAll('.project-card').forEach((card) => {

        card.addEventListener('pointerenter', (e) => {
            if (e.pointerType !== 'mouse') return; // ignore touch, so taps just click
            if (card === lockedCard) return;

            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => {
                lastOpenedCard = card;
                card.click(); // runs the card's click handler
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
// ---------- Build the cards from works.json ----------
async function loadProjects() {
    const grid = document.querySelector('.portfolio-grid');
    const response = await fetch('projects.json');
    const works = await response.json();

        // Reveals each card the first time it scrolls into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);   // only animate once
            }
        });
    }, { threshold: 0.15 });

    works
        .filter((work) => work.status === 'live')
        .sort((a, b) => a.count - b.count)
        .forEach((work, index) => {
            const card = document.createElement('div');
            card.className = 'project-card';

            const media = work.image
                ? `<img src="${work.image}" class="project-image" alt="${work.title}">`
                : `<div class="project-image"></div>`;

            card.innerHTML = `
                ${media}
                <div class="project-info">
                    <p>${work.client}</p>
                    <h3>${work.title}</h3>
                </div>
            `;

                       if (work.image) {
card.addEventListener('click', () => openLightbox(
    work.image,
    work.description,
    work.audio,
    { title: work.title, type: work.category, date: work.date }
));            }

                        card.classList.add('reveal');
            card.style.setProperty('--i', index % 3);   // 0, 1, 2 across each row of three
            grid.appendChild(card);
            observer.observe(card);
        });

    setupCardHover();
}

loadProjects();
