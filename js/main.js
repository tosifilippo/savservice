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

    /* ── Team modal ───────────────────────────────────────────── */
    const teamModal = document.getElementById('team-modal');
    const teamCards = Array.prototype.slice.call(document.querySelectorAll('[data-team-card]'));

    if (teamModal && teamCards.length) {
        const modalImg = document.getElementById('team-modal-img');
        const modalInitials = document.getElementById('team-modal-initials');
        const modalName = document.getElementById('team-modal-name');
        const modalRole = document.getElementById('team-modal-role');
        const modalBio = document.getElementById('team-modal-bio');
        const modalContacts = document.getElementById('team-modal-contacts');
        const modalClose = document.getElementById('team-modal-close');
        const modalOverlay = document.getElementById('team-modal-overlay');
        const modalPrev = document.getElementById('team-modal-prev');
        const modalNext = document.getElementById('team-modal-next');
        let lastFocused = null;
        let currentIndex = 0;

        const mailIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 6h18v12H3zM3 7l9 6 9-6"/></svg>';
        const phoneIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.5 2.4.8 3.7.9.6 0 1 .5 1 1v3.6c0 .6-.5 1-1 1C10.6 21.5 2.5 13.4 2.5 3.3c0-.6.5-1 1-1H7c.6 0 1 .5 1 1 .1 1.3.4 2.5.9 3.7.1.4 0 .8-.2 1l-2.1 2.1z"/></svg>';

        function renderTeamModal(index) {
            const card = teamCards[index];
            const name = card.getAttribute('data-name');
            const role = card.getAttribute('data-role');
            const bio = card.getAttribute('data-bio');
            const photo = card.getAttribute('data-photo');
            const initials = card.getAttribute('data-initials');
            const email = card.getAttribute('data-email');
            const phone = card.getAttribute('data-phone');

            if (photo) {
                modalImg.src = photo;
                modalImg.alt = name;
                modalImg.style.display = 'block';
                modalInitials.style.display = 'none';
            } else {
                modalImg.style.display = 'none';
                modalInitials.style.display = 'flex';
                modalInitials.textContent = initials || '';
            }

            modalName.textContent = name;
            modalRole.textContent = role;
            modalBio.textContent = bio;

            modalContacts.innerHTML = '';
            if (email) {
                const a = document.createElement('a');
                a.href = 'mailto:' + email;
                a.innerHTML = mailIcon + '<span>' + email + '</span>';
                modalContacts.appendChild(a);
            }
            if (phone) {
                const a = document.createElement('a');
                a.href = 'tel:+39' + phone.replace(/\s+/g, '');
                a.innerHTML = phoneIcon + '<span>+39 ' + phone + '</span>';
                modalContacts.appendChild(a);
            }
        }

        function openTeamModal(index) {
            currentIndex = index;
            renderTeamModal(currentIndex);
            lastFocused = document.activeElement;
            teamModal.classList.add('open');
            teamModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            modalClose.focus();
        }

        function closeTeamModal() {
            teamModal.classList.remove('open');
            teamModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (lastFocused) lastFocused.focus();
        }

        function showNext() {
            currentIndex = (currentIndex + 1) % teamCards.length;
            renderTeamModal(currentIndex);
        }

        function showPrev() {
            currentIndex = (currentIndex - 1 + teamCards.length) % teamCards.length;
            renderTeamModal(currentIndex);
        }

        teamCards.forEach(function (card, index) {
            card.addEventListener('click', function () { openTeamModal(index); });
            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openTeamModal(index);
                }
            });
        });

        modalClose.addEventListener('click', closeTeamModal);
        modalOverlay.addEventListener('click', closeTeamModal);
        modalNext.addEventListener('click', showNext);
        modalPrev.addEventListener('click', showPrev);
        document.addEventListener('keydown', function (e) {
            if (!teamModal.classList.contains('open')) return;
            if (e.key === 'Escape') closeTeamModal();
            if (e.key === 'ArrowRight') showNext();
            if (e.key === 'ArrowLeft') showPrev();
        });
    }

    /* ── Marquee continuo (tutti gli schermi) ───────────────────── */
    var MARQUEE_SPEED = 0.5;
    var isMobile = window.innerWidth <= 768;

    document.querySelectorAll('.cards-grid-3, .cards-grid-4, .team-grid, .convegni-grid').forEach(function (el) {
        if (!isMobile && el.classList.contains('team-grid')) return;
        var kids = Array.prototype.slice.call(el.children);
        if (kids.length < 2) return;

        var gap = parseFloat(getComputedStyle(el).columnGap) || (isMobile ? 16 : 24);
        var isTeam = el.classList.contains('team-grid');
        var cardW = isMobile
            ? window.innerWidth * (isTeam ? 0.72 : 0.82)
            : (isTeam ? 280 : 360);

        var track = document.createElement('div');
        track.style.cssText = 'display:flex;gap:' + gap + 'px;will-change:transform;cursor:grab;';

        kids.forEach(function (child) {
            child.style.flex = '0 0 ' + cardW + 'px';
            child.style.minWidth = '0';
            track.appendChild(child);
        });

        kids.forEach(function (child) {
            var clone = child.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            track.appendChild(clone);
        });

        el.appendChild(track);
        el.style.overflow = 'hidden';
        el.style.display = 'block';

        var offset = 0;
        var paused = false;
        var resumeTimer = null;

        function resume() {
            resumeTimer = setTimeout(function () { paused = false; }, 750);
        }

        /* pulsanti prev / next */
        el.style.position = 'relative';
        var btnBase = 'position:absolute;top:50%;transform:translateY(-50%);' +
            'width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,.88);' +
            'box-shadow:0 2px 8px rgba(0,0,0,.18);cursor:pointer;z-index:10;' +
            'display:flex;align-items:center;justify-content:center;color:#1B4F6B;padding:0;';
        var svgL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        var svgR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        var btnPrev = document.createElement('button');
        var btnNext = document.createElement('button');
        btnPrev.setAttribute('aria-label', 'Precedente');
        btnNext.setAttribute('aria-label', 'Successivo');
        btnPrev.style.cssText = btnBase + 'left:8px;';
        btnNext.style.cssText = btnBase + 'right:8px;';
        btnPrev.innerHTML = svgL;
        btnNext.innerHTML = svgR;
        el.appendChild(btnPrev);
        el.appendChild(btnNext);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                var realW = track.firstElementChild ? track.firstElementChild.offsetWidth : cardW;
                var halfWidth = kids.length * (realW + gap);
                var FAST = 4;   /* px/frame quando il pulsante è tenuto premuto */
                var manualDir = 0; /* -1 indietro, 0 auto, +1 avanti */

                function btnPress(dir) {
                    paused = true; clearTimeout(resumeTimer); manualDir = dir;
                }
                function btnRelease() {
                    manualDir = 0; resume();
                }

                [btnPrev, btnNext].forEach(function (btn, i) {
                    var dir = i === 0 ? -1 : 1;
                    btn.addEventListener('mousedown', function (e) {
                        e.stopPropagation(); btnPress(dir);
                    });
                    btn.addEventListener('touchstart', function (e) {
                        e.stopPropagation(); btnPress(dir);
                    }, { passive: true });
                    btn.addEventListener('touchend', function (e) {
                        e.stopPropagation(); btnRelease();
                    }, { passive: true });
                });
                window.addEventListener('mouseup', function () {
                    if (manualDir !== 0) btnRelease();
                });

                /* Touch */
                var touchStartX = 0;
                var touchStartY = 0;
                var isHoriz = null;
                el.addEventListener('touchstart', function (e) {
                    paused = true; clearTimeout(resumeTimer);
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    isHoriz = null;
                }, { passive: true });
                el.addEventListener('touchmove', function (e) {
                    var curX = e.touches[0].clientX;
                    var curY = e.touches[0].clientY;
                    var dx = touchStartX - curX;
                    var dy = touchStartY - curY;
                    if (isHoriz === null) {
                        if (Math.abs(dx) + Math.abs(dy) < 6) return;
                        isHoriz = Math.abs(dx) >= Math.abs(dy);
                    }
                    if (!isHoriz) return;
                    e.preventDefault();
                    touchStartX = curX;
                    touchStartY = curY;
                    offset = (offset + dx + halfWidth) % halfWidth;
                    track.style.transform = 'translateX(-' + offset + 'px)';
                }, { passive: false });
                el.addEventListener('touchend', resume, { passive: true });

                /* Mouse drag */
                var dragging = false;
                var mouseStartX = 0;
                el.addEventListener('mousedown', function (e) {
                    if (e.target === btnPrev || e.target === btnNext) return;
                    dragging = true; paused = true; clearTimeout(resumeTimer);
                    mouseStartX = e.clientX;
                    track.style.cursor = 'grabbing';
                });
                window.addEventListener('mousemove', function (e) {
                    if (!dragging) return;
                    var dx = mouseStartX - e.clientX;
                    mouseStartX = e.clientX;
                    offset = (offset + dx + halfWidth) % halfWidth;
                    track.style.transform = 'translateX(-' + offset + 'px)';
                });
                window.addEventListener('mouseup', function () {
                    if (!dragging) return;
                    dragging = false;
                    track.style.cursor = 'grab';
                    resume();
                });

                (function tick() {
                    if (manualDir !== 0) {
                        offset = (offset + manualDir * FAST + halfWidth) % halfWidth;
                        track.style.transform = 'translateX(-' + offset + 'px)';
                    } else if (!paused) {
                        offset += MARQUEE_SPEED;
                        if (offset >= halfWidth) offset -= halfWidth;
                        track.style.transform = 'translateX(-' + offset + 'px)';
                    }
                    requestAnimationFrame(tick);
                })();
            });
        });
    });

})();
