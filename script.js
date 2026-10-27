// JavaScript to handle opening portfolio items full-screen

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');

const HOVER_DELAY = 1300; // ms to hover before the lightbox opens
let hoverTimer = null;
let lockedCard = null;     // stops it instantly re-opening after you close it while still hovering
let lastOpenedCard = null;

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
    lightbox.classList.remove('active');
    document.body.classList.remove('lightbox-open');
    lockedCard = lastOpenedCard; // must move off the card before hover can trigger again
}

// Press Esc to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
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
