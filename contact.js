async function initContact() {
    // ---------- Fill the page from site.json ----------
    let site = {};
    try {
        const response = await fetch('site.json');
        site = await response.json();
    } catch (error) {
        console.error('Could not load site.json:', error);
        return;
    }

    const emailLink = document.getElementById('contact-email');
    emailLink.href = `mailto:${site.email}`;
    document.getElementById('email-text').textContent = site.email;

    const phone = document.getElementById('info-phone');
    phone.textContent = site.phone;
    phone.href = `tel:${site.phone.replace(/[^\d+]/g, '')}`;     // strips spaces and dashes for the link

    const location = document.getElementById('info-location');
    (site.location || []).forEach((line) => {
        const p = document.createElement('div');
        p.textContent = line;
        location.appendChild(p);
    });

    const socials = document.getElementById('info-socials');
    (site.socials || []).forEach((s) => {
        const a = document.createElement('a');
        a.href = s.url;
        a.textContent = s.label;
        a.target = '_blank';
        a.rel = 'noopener';
        socials.appendChild(a);
    });

    // ---------- Send the form without leaving the page ----------
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = 'Sending...';

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' }
            });
            if (response.ok) {
                status.textContent = 'Thank you! Your message has been sent.';
                form.reset();
            } else {
                status.textContent = 'Something went wrong. Please email me directly instead.';
            }
        } catch (error) {
            status.textContent = 'Something went wrong. Please email me directly instead.';
        }
    });
}

initContact();