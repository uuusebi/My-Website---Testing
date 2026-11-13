/* ============================================================
   home.js: the Home page
   1. Featured work strip (projects marked "featured": true in projects.json)
   2. Contact call-to-action (location lines from site.json)
   ============================================================ */

const FEATURED_COUNT = 3;         // how many featured cards to show

// Makes text safe to place inside HTML (a title with a quote mark can't break the page)
function escapeHTML(text = '') {
    return String(text).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ---------- 1. Featured work ----------
async function loadFeatured() {
    const grid = document.getElementById('featured-grid');

    try {
        const response = await fetch('projects.json');
        const works = await response.json();

        // Reveals each card the first time it scrolls into view (same as the Work page)
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);            // only animate once
                }
            });
        }, { threshold: 0.15 });

        works
            .filter((work) => work.status === 'live' && work.featured)
            .sort((a, b) => a.count - b.count)
            .slice(0, FEATURED_COUNT)
            .forEach((work, index) => {
                // Same card markup as the Work page, linking straight to the project page
                const card = document.createElement('a');
                card.href = `project.html?slug=${encodeURIComponent(work.slug)}`;
                card.className = 'project-card reveal';
                card.style.setProperty('--i', index);           // staggers the reveal

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

                grid.appendChild(card);
                observer.observe(card);
            });
    } catch (error) {
        console.error('Could not load projects.json:', error);
        grid.closest('.featured').hidden = true;                // hide the strip instead of showing an empty box
    }
}

// ---------- 2. Contact call-to-action ----------
async function loadCta() {
    try {
        const response = await fetch('site.json');
        const site = await response.json();
        if (site.location) {
            document.getElementById('cta-location').textContent = site.location.join(' ');
        }
    } catch (error) {
        console.error('Could not load site.json:', error);      // the default text stays
    }
}

loadFeatured();
loadCta();
