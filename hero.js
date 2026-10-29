(function () {
    const hero = document.querySelector('header.hero');
    if (!hero) return;                                   // does nothing on the About page

    const title = hero.querySelector('h1');
    const intro = hero.querySelector('p');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const START_DELAY = 300;    // ms before anything happens
    const TITLE_SPEED = 90;     // ms per letter for the name
    const INTRO_SPEED = 18;     // ms per letter for the paragraph

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Turns "Hello" into <span>H</span><span>e</span>... so each letter can appear on its own
    function splitChars(el) {
        const text = el.textContent;
        el.setAttribute('aria-label', text);             // screen readers still read the full text
        el.textContent = '';
        return [...text].map((ch) => {
            const span = document.createElement('span');
            span.className = 'char';
            span.setAttribute('aria-hidden', 'true');
            span.textContent = ch;
            el.appendChild(span);
            return span;
        });
    }

    // Reveals letters one at a time, moving a blinking caret along
    function typeChars(chars, speed) {
        return new Promise((resolve) => {
            let i = 0;
            function tick() {
                if (i > 0) chars[i - 1].classList.remove('caret');
                chars[i].classList.add('on', 'caret');
                i++;
                if (i < chars.length) {
                    setTimeout(tick, speed + Math.random() * speed * 0.6);   // slightly uneven, like real typing
                } else {
                    setTimeout(() => chars[chars.length - 1].classList.remove('caret'), 900);
                    resolve();
                }
            }
            tick();
        });
    }

    async function playIntro() {
        if (reduceMotion) {
            hero.classList.add('static');                // skip everything, just show the text
            return;
        }
        const titleChars = splitChars(title);
        const introChars = splitChars(intro);

        hero.classList.add('ready');                     // starts the grain
        await wait(START_DELAY);
        title.classList.add('focus');                    // blur-to-sharp + fade-in begins
        await typeChars(titleChars, TITLE_SPEED);
        await wait(150);
        intro.classList.add('focus');
        await typeChars(introChars, INTRO_SPEED);
    }

    // ---------- Scroll: blur + fade out ----------
    let ticking = false;

    function updateScroll() {
        const range = window.innerHeight * 0.7;          // scroll distance over which the hero disappears
        const p = Math.min(Math.max(window.scrollY / range, 0), 1);
        hero.style.setProperty('--p', p.toFixed(3));
        hero.classList.toggle('gone', p >= 1);           // fully hidden once you reach the content
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateScroll);         // keeps scrolling smooth
            ticking = true;
        }
    }, { passive: true });

    updateScroll();
    playIntro();
})();