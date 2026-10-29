const contactBtn = document.getElementById('contact-btn');
const contactMenu = document.getElementById('contact-menu');

function closeContactMenu() {
    contactMenu.classList.remove('open');
    contactBtn.setAttribute('aria-expanded', 'false');
}

// Click Contact to open or close the dropdown
contactBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // keeps this click from also triggering the "click elsewhere" close below
    const isOpen = contactMenu.classList.toggle('open');
    contactBtn.setAttribute('aria-expanded', isOpen);
});

// Click anywhere else, or press Esc, to close it
document.addEventListener('click', closeContactMenu);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeContactMenu();
});