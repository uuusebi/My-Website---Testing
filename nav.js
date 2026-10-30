async function initNav() {
    // Load contact info from site.json
    let site = { email: '', phone: '' };
    try {
        const response = await fetch('site.json');
        site = await response.json();
    } catch (error) {
        console.error('Could not load site.json:', error);
    }

    // Figure out which page we're on, so the right link shows as active
    const page = location.pathname.split('/').pop() || 'index.html';
    const active = (file) => (page === file ? ' active' : '');

    // The hover zone wraps the nav and the handle
    const zone = document.createElement('div');
    zone.className = 'nav-zone';
    zone.innerHTML = `
        <nav class="navbar">
            <a href="index.html" class="nav-link${active('index.html')}">Home</a>
            <a href="about.html" class="nav-link${active('about.html')}">About</a>

            <div class="nav-contact">
                <button type="button" class="nav-link" id="contact-btn" aria-expanded="false">Contact</button>
                <div class="contact-menu" id="contact-menu">
                    <a href="mailto:${site.email}">Email</a>
                </div>
            </div>
        </nav>
        <div class="nav-handle"></div>
    `;
    document.body.prepend(zone);

    const contactBtn = zone.querySelector('#contact-btn');
    const contactMenu = zone.querySelector('#contact-menu');

    // ---------- Show / hide ----------
    const HIDE_DELAY = 400;   // ms to wait after the cursor leaves before hiding
    let hideTimer = null;

    function showNav() {
        clearTimeout(hideTimer);
        zone.classList.add('visible');
    }

    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            if (!contactMenu.classList.contains('open')) {   // stay up while the dropdown is open
                zone.classList.remove('visible');
            }
        }, HIDE_DELAY);
    }

    zone.addEventListener('pointerenter', showNav);
    zone.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse') scheduleHide();
    });

    // Touch screens: tapping the zone shows the nav, tapping elsewhere hides it
    document.addEventListener('pointerdown', (e) => {
        if (!zone.contains(e.target)) {
            closeContactMenu();
            clearTimeout(hideTimer);
            zone.classList.remove('visible');
        }
    });

    // ---------- Contact dropdown ----------
    function closeContactMenu() {
        contactMenu.classList.remove('open');
        contactBtn.setAttribute('aria-expanded', 'false');
        if (!zone.matches(':hover')) scheduleHide();         // hide if the cursor is already away
    }

    contactBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = contactMenu.classList.toggle('open');
        contactBtn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', closeContactMenu);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeContactMenu();
    });
}

initNav();