/* ============================================================
   nav.js: builds the top bar on every page
   Layout:  [ Sebastian Nunez ]   Work  About  Contact   [ Archive  Instagram ]
   Load it once per page, at the bottom of <body>.
   ============================================================ */

async function initNav() {
    // Safety net: if this script is ever loaded twice, don't build a second bar.
    // (Two stacked bars was what made "Work" and the name look like outlines.)
    // The flag has to be set right away, before the fetch below, because a
    // second copy of the script would otherwise run before the first bar exists.
    if (window.navReady) return;
    window.navReady = true;

    // Load contact info and social links from site.json
    let site = {};
    try {
        const response = await fetch('site.json');
        site = await response.json();
    } catch (error) {
        console.error('Could not load site.json:', error);   // the bar still builds, just without Instagram
    }

    // Which page are we on? "about.html", "/about" and "/about/" all become "about"
    const page = (location.pathname.split('/').pop() || 'index').replace('.html', '');

    // Marks the link for the current page, for screen readers and for styling
    // if you ever want it: a[aria-current="page"] { ... }
    const current = (name) => (page === name ? ' aria-current="page"' : '');

    // The Instagram link comes from the socials list in site.json
    const instagram = (site.socials || []).find((s) => s.label.toLowerCase() === 'instagram');

    const bar = document.createElement('nav');
    bar.className = 'topbar';
    bar.innerHTML = `
        <a href="index.html" class="topbar-brand">Sebastian Nunez</a>

        <div class="topbar-links">
            <a href="index.html"${current('index')}>Work</a>
            <a href="about.html"${current('about')}>About</a>
            <a href="contact.html"${current('contact')}>Contact</a>
        </div>

        <div class="topbar-right">
            <a href="archive.html"${current('archive')}>Archive</a>
            ${instagram ? `<a href="${instagram.url}" class="topbar-social" target="_blank" rel="noopener">Instagram</a>` : ''}
        </div>
    `;
    document.body.prepend(bar);   // puts the bar at the very top of <body>
}

initNav();
