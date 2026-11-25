/* ============================================================
   hero.js: the intro animation and scroll-out effect for the big header
   Used on the home page and the About page.
   ============================================================ */

(function () {
    const hero = document.querySelector('header.hero');
    if (!hero) return;                                   // pages without a hero do nothing

    const title = hero.querySelector('h1');
    const intro = hero.querySelector('p');               // may be empty or missing, and that's fine
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Settings you can tweak ----------
    // The real values live in style.css :root (--hero-*). These numbers are only fallbacks.
    const START_DELAY = 300;    // ms before anything happens
    const TITLE_SPEED = 90;     // ms per letter for the name
    const INTRO_SPEED = 18;     // ms per letter for the paragraph
    const SCROLL_RANGE = 0.7;   // share of the window height you scroll to make the hero disappear

    // Reads a number from a CSS variable in style.css :root (the tweak pane can change these).
    // Falls back to the number given if the variable is missing.
    function cssNumber(name, fallback) {
        const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
        return Number.isFinite(value) ? value : fallback;
    }

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

    // Each play of the intro gets a number. A replay bumps it, and an older run
    // notices it's out of date and stops (so two runs never type at once).
    let runId = 0;
    let titleChars = null;                               // the letter <span>s, made once
    let introChars = [];

    // Reveals letters one at a time, moving a blinking caret along
    function typeChars(chars, speed, id) {
        return new Promise((resolve) => {
            if (chars.length === 0) return resolve();    // nothing to type (empty paragraph), so finish right away

            let i = 0;
            function tick() {
                if (id !== runId) return resolve();      // a replay started: stop this run
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

        const id = ++runId;
        if (!titleChars) {                               // first play: split the text into letters
            titleChars = splitChars(title);
            introChars = intro ? splitChars(intro) : [];
        }

        await wait(cssNumber('--hero-start-delay', START_DELAY));
        if (id !== runId) return;

        title.classList.add('focus');                    // blur-to-sharp + fade-in begins
        await typeChars(titleChars, cssNumber('--hero-title-speed', TITLE_SPEED), id);

        if (introChars.length > 0) {                     // only animate the paragraph if it has text
            await wait(150);
            if (id !== runId) return;
            intro.classList.add('focus');
            await typeChars(introChars, cssNumber('--hero-intro-speed', INTRO_SPEED), id);
        }

        // Tell the page the intro is done (home.js moves on to the next stage; About ignores it)
        if (id === runId) document.dispatchEvent(new CustomEvent('hero:done'));
    }

    // Replay (sent by the dev tweak pane, tweaks.js): hide every letter, then play again
    function replayIntro() {
        if (reduceMotion || !titleChars) return;
        [...titleChars, ...introChars].forEach((ch) => ch.classList.remove('on', 'caret'));
        title.classList.remove('focus');
        if (intro) intro.classList.remove('focus');
        void hero.offsetWidth;                           // forces the browser to notice the removal, so the CSS animations restart
        playIntro();
    }

    document.addEventListener('tweaks:replay', (e) => {
        if (e.detail.part === 'hero') {
            updateScroll();                              // picks up a new scroll range
            replayIntro();
        }
    });

    // ---------- Scroll: blur + fade out ----------
    let ticking = false;

    function updateScroll() {
        const range = window.innerHeight * cssNumber('--hero-scroll-range', SCROLL_RANGE);   // scroll distance over which the hero disappears
        const p = Math.min(Math.max(window.scrollY / range, 0), 1);   // progress from 0 to 1
        hero.style.setProperty('--p', p.toFixed(3));     // CSS reads this to set the blur and opacity
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
