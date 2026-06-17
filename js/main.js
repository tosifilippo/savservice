/* ============================================================
   SAV Service — main.js
   - Navbar scroll effect
   - Hamburger menu
   - Smooth scroll con offset nav
   - Scroll reveal (IntersectionObserver)
   - Form Formspree handler
   ============================================================ */

(function () {
    'use strict';

    /* ── Navbar scroll shadow ─────────────────────────────── */
    const nav = document.getElementById('nav');

    function onScroll() {
        nav.classList.toggle('scrolled', window.scrollY > 10);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ── Hamburger menu ───────────────────────────────────── */
    const hamburger = document.getElementById('hamburger');
    const navMobile = document.getElementById('nav-mobile');

    hamburger.addEventListener('click', function () {
        const isOpen = navMobile.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', isOpen);
        navMobile.setAttribute('aria-hidden', !isOpen);
    });

    // Close mobile menu on link click
    navMobile.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            navMobile.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            navMobile.setAttribute('aria-hidden', 'true');
        });
    });

    /* ── Smooth scroll con offset nav ────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();

            const navHeight = nav.getBoundingClientRect().height;
            const top = target.getBoundingClientRect().top + window.scrollY - navHeight;

            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });

    /* ── Scroll reveal ────────────────────────────────────── */
    const revealEls = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );

        revealEls.forEach(function (el) { observer.observe(el); });
    } else {
        // Fallback per browser senza IntersectionObserver
        revealEls.forEach(function (el) { el.classList.add('visible'); });
    }

    /* ── Mappa Italia — tooltip hover ────────────────────── */
    document.querySelectorAll('polygon.region.zes').forEach(function(el) {
        el.addEventListener('mouseenter', function(e) {
            const name = el.getAttribute('data-name');
            const incentivo = el.getAttribute('data-incentivo');
            if (!name) return;
            let tip = document.getElementById('map-tooltip');
            if (tip) {
                tip.style.display = 'block';
                const rect = el.getBoundingClientRect();
                const svgRect = el.closest('svg').getBoundingClientRect();
                // position inside SVG via foreignObject is complex; use CSS tooltip instead
            }
        });
    });

    /* ── Cookie banner ────────────────────────────────────── */
    const cookieBanner = document.getElementById('cookie-banner');
    const cookieAccept = document.getElementById('cookie-accept');
    const cookieReject = document.getElementById('cookie-reject');
    const COOKIE_KEY = 'sav_cookie_consent';

    function hideCookieBanner() {
        cookieBanner.classList.remove('visible');
        cookieBanner.setAttribute('aria-hidden', 'true');
    }

    if (!localStorage.getItem(COOKIE_KEY)) {
        setTimeout(function () {
            cookieBanner.classList.add('visible');
            cookieBanner.setAttribute('aria-hidden', 'false');
        }, 1200);
    }

    cookieAccept.addEventListener('click', function () {
        localStorage.setItem(COOKIE_KEY, 'accepted');
        hideCookieBanner();
    });

    cookieReject.addEventListener('click', function () {
        localStorage.setItem(COOKIE_KEY, 'rejected');
        hideCookieBanner();
    });

    /* ── Hero progress bar animate on reveal ─────────────── */
    const progressFill = document.querySelector('.hv-progress-fill');
    if (progressFill) {
        const targetWidth = progressFill.style.width;
        progressFill.style.width = '0%';
        const heroVisual = document.querySelector('.hero-visual');
        if (heroVisual && 'IntersectionObserver' in window) {
            const progressObserver = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) {
                    setTimeout(function () {
                        progressFill.style.width = targetWidth;
                    }, 600);
                    progressObserver.disconnect();
                }
            }, { threshold: 0.5 });
            progressObserver.observe(heroVisual);
        } else if (progressFill) {
            progressFill.style.width = targetWidth;
        }
    }

    /* ── Form Formspree ───────────────────────────────────── */
    const form = document.getElementById('contact-form');
    const formSuccess = document.getElementById('form-success');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Invio in corso…';
            btn.disabled = true;

            fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            })
            .then(function (response) {
                if (response.ok) {
                    form.reset();
                    formSuccess.classList.add('show');
                    btn.textContent = 'Messaggio inviato ✓';
                    setTimeout(function () {
                        btn.textContent = originalText;
                        btn.disabled = false;
                    }, 4000);
                } else {
                    throw new Error('Errore invio');
                }
            })
            .catch(function () {
                btn.textContent = 'Errore — riprova';
                btn.disabled = false;
                setTimeout(function () { btn.textContent = originalText; }, 3000);
            });
        });
    }

    /* ── Back to top ──────────────────────────────────────────── */
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', function () {
            backToTop.classList.toggle('visible', window.scrollY > 400);
        }, { passive: true });
        backToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

})();
