// JavaScript to handle opening portfolio items full-screen

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');

const HOVER_DELAY = 300; // ms to hover before the lightbox opens
const LEAVE_CLOSE_DELAY = 250;  // ms after leaving the image before it closes (forgives small slips)

let hoverTimer = null;
let leaveTimer = null;
let lockedCard = null;          // stops instant re-open after closing while still on the card
let lastOpenedCard = null;
let armedToClose = false;       // only true once the cursor has been over the image
let mouseX = 0;
let mouseY = 0;

// Track the cursor so we know if it's still on a card when the lightbox closes
document.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

function isOverCard(card) {
    if (!card) return false;
    const r = card.getBoundingClientRect();
    return mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom;

function openLightbox(imageSrc, descriptionText) {

    // Only attempts to load if you have a real image file name
    if (imageSrc && imageSrc !== '') {
        lightboxImg.src = imageSrc;
    }

    // Inject the description text into the popup window
    if (descriptionText) {
        lightboxCaption.textContent = descriptionText;
    } else {
        lightboxCaption.textContent = "";
        // Leaves it blank if you don't provide a description
    }
   
    armedToClose = false;
    clearTimeout(leaveTimer);
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

// Hover-to-open after 1.3 seconds (mouse devices only, not touch)
if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.project-card').forEach((card) => {

        card.addEventListener('mouseenter', () => {
            if (card === lockedCard) return;
            hoverTimer = setTimeout(() => {
                lastOpenedCard = card;
                card.click(); // runs the card's existing onclick
            }, HOVER_DELAY);
        });

        card.addEventListener('mouseleave', () => {
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
