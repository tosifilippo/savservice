/* ============================================================
   SAV Service — Iscrizioni eventi
   Invia i dati del form a un Google Apps Script che li scrive
   in un foglio Google (vedi docs/iscrizioni-eventi-setup.md).
   ============================================================ */
(function () {
    'use strict';

    /* ── CONFIGURAZIONE ───────────────────────────────────────
       Incollare qui l'URL della Web App restituito da Apps Script
       dopo il "Deploy → Nuova distribuzione → App web".
       Formato: https://script.google.com/macros/s/AKfy.../exec     */
    var ENDPOINT = 'https://script.google.com/macros/s/AKfycbx08OSUWdRCxogm78a1ZTRJgG_rCuKZMWF_VFfJ8LQlhONH-zej0U5Hn1eqT2x5U7Xz/exec';

    /* ── Menu mobile ──────────────────────────────────────────
       Le pagine evento non caricano main.js (è tutto codice legato
       alla home), quindi l'hamburger va gestito qui.               */
    var hamburger = document.getElementById('hamburger');
    var navMobile = document.getElementById('nav-mobile');

    if (hamburger && navMobile) {
        hamburger.addEventListener('click', function () {
            var isOpen = navMobile.classList.toggle('open');
            hamburger.setAttribute('aria-expanded', isOpen);
            navMobile.setAttribute('aria-hidden', !isOpen);
        });

        navMobile.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                navMobile.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
                navMobile.setAttribute('aria-hidden', 'true');
            });
        });
    }

    /* ── Scroll morbido verso il form ─────────────────────────── */
    document.querySelectorAll('a[href="#iscrizione"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var target = document.getElementById('iscrizione');
            if (!target) return;
            e.preventDefault();
            var top = target.getBoundingClientRect().top + window.pageYOffset - 88;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });

    var form = document.getElementById('evento-form');
    if (!form) return;

    var success = document.getElementById('evento-form-success');
    var error   = document.getElementById('evento-form-error');
    var btn     = form.querySelector('button[type="submit"]');
    var btnText = btn ? btn.textContent : '';

    function mostraErrore(msg) {
        if (error) {
            error.innerHTML = msg;
            error.classList.add('show');
        }
        if (btn) {
            btn.textContent = btnText;
            btn.disabled = false;
        }
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        /* Honeypot anti-spam: se compilato, il bot crede di aver inviato */
        if (form.querySelector('[name="_gotcha"]').value) return;

        if (error) error.classList.remove('show');
        if (success) success.classList.remove('show');

        if (ENDPOINT.indexOf('script.google.com') === -1) {
            mostraErrore('Modulo non ancora collegato al foglio iscrizioni. Scrivi a <a href="mailto:info@savservice.it">info@savservice.it</a> per prenotare.');
            return;
        }

        if (btn) {
            btn.textContent = 'Invio in corso…';
            btn.disabled = true;
        }

        /* Una sola richiesta, mai un secondo invio: se il POST parte la riga
           sul foglio è scritta, quindi rispedirlo creerebbe iscrizioni doppie.
           FormData produce una richiesta "semplice" (multipart/form-data):
           niente preflight OPTIONS, che Apps Script non gestisce. */
        fetch(ENDPOINT, { method: 'POST', body: new FormData(form) })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.result === 'success') {
                    completa();
                } else {
                    mostraErrore('Invio non riuscito. Riprova, oppure scrivici a <a href="mailto:info@savservice.it">info@savservice.it</a>.');
                }
            })
            .catch(function () {
                /* La risposta non è leggibile (CORS, rete caduta a metà…).
                   L'iscrizione con ogni probabilità è arrivata: lo diciamo
                   senza reinviare e senza promettere troppo. */
                completa('Richiesta inviata. Se entro breve non ricevi la nostra email di conferma, scrivici a info@savservice.it.');
            });
    });

    function completa(messaggio) {
        form.reset();
        if (success) {
            if (messaggio) success.textContent = messaggio;
            success.classList.add('show');
        }
        if (btn) {
            btn.textContent = 'Iscrizione inviata ✓';
            setTimeout(function () {
                btn.textContent = btnText;
                btn.disabled = false;
            }, 5000);
        }
        if (success) success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
})();
