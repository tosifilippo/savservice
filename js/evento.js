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
    var ENDPOINT = 'INCOLLA_QUI_URL_APPS_SCRIPT';

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

        /* FormData produce una richiesta "semplice" (multipart/form-data):
           niente preflight OPTIONS, che Apps Script non gestisce. */
        fetch(ENDPOINT, { method: 'POST', body: new FormData(form) })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.result === 'success') {
                    completa();
                } else {
                    throw new Error(data && data.message ? data.message : 'Errore');
                }
            })
            .catch(function () {
                /* Rete o CORS: riprova in no-cors. La risposta non è
                   leggibile, ma la riga viene comunque scritta sul foglio. */
                fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: new FormData(form) })
                    .then(completa)
                    .catch(function () {
                        mostraErrore('Invio non riuscito. Riprova, oppure scrivici a <a href="mailto:info@savservice.it">info@savservice.it</a>.');
                    });
            });
    });

    function completa() {
        form.reset();
        if (success) success.classList.add('show');
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
