/* ============================================================
   archive.js: builds the Archive list from projects.json
   and shows a preview image that follows the cursor on hover.
   ============================================================ */

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

async function loadArchive() {
    const list = document.getElementById('archive-list');

    // One shared preview image that follows the cursor
    const preview = document.createElement('img');
    preview.className = 'archive-preview';
    preview.alt = '';
    document.body.appendChild(preview);

    document.addEventListener('pointermove', (e) => {
        preview.style.left = e.clientX + 'px';
        preview.style.top = e.clientY + 'px';
        preview.classList.toggle('flip', e.clientX > window.innerWidth - 360);   // flips to the left near the right edge
    });

    try {
        const response = await fetch('projects.json');
        const works = await response.json();

        works
            .filter((work) => work.status === 'live')    // hides drafts, like the home grid
            .sort((a, b) => a.count - b.count)           // same order as the home grid
            .forEach((work) => {
                // Each row is a link to the project's page
                const row = document.createElement('a');
                row.href = `project.html?slug=${encodeURIComponent(work.slug)}`;
                row.className = 'archive-row';

                // One <span> per column. textContent keeps odd characters in titles safe.
                [work.title, work.client, work.category, work.date].forEach((text) => {
                    const cell = document.createElement('span');
                    cell.textContent = text || '';
                    row.appendChild(cell);
                });

                // Show the preview while hovering a row (only if the project has an image)
                if (work.image) {
                    row.addEventListener('pointerenter', (e) => {
                        if (e.pointerType !== 'mouse') return;   // no hover preview on touch screens
                        preview.src = encodeURI(work.image);     // encodeURI makes spaces in file names safe
                        preview.classList.add('show');
                    });
                    row.addEventListener('pointerleave', () => {
                        preview.classList.remove('show');
                    });
                }

                list.appendChild(row);
            });
    } catch (error) {
        console.error('Could not load projects.json:', error);
        showLoadError();
    }
}

loadArchive();
