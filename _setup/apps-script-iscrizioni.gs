/* ============================================================
   SAV Service — Raccolta iscrizioni eventi
   Google Apps Script collegato al foglio "Iscrizioni eventi SAV".
   Istruzioni di installazione: _setup/iscrizioni-eventi-setup.md
   ============================================================ */

/* Nome della scheda del foglio in cui scrivere le iscrizioni.
   Se non esiste viene creata al primo invio. */
var FOGLIO = 'Iscrizioni';

/* Email a cui inviare una notifica a ogni nuova iscrizione.
   Lasciare stringa vuota ('') per disattivare le notifiche. */
var NOTIFICA_A = '';

var INTESTAZIONI = [
    'Data iscrizione',
    'Evento',
    'Data evento',
    'Luogo',
    'Nome',
    'Cognome',
    'Email',
    'Telefono',
    'Azienda',
    'Ruolo',
    'Partecipanti',
    'Note',
    'Consenso privacy'
];

function doPost(e) {
    /* Il lock evita che due iscrizioni simultanee scrivano sulla stessa riga */
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
        var p = (e && e.parameter) ? e.parameter : {};

        /* Honeypot: se il campo nascosto è compilato è un bot, scartiamo */
        if (p._gotcha) {
            return rispostaJson({ result: 'success' });
        }

        var foglio = getFoglio();

        foglio.appendRow([
            new Date(),
            p.evento || '',
            p.data_evento || '',
            p.luogo || '',
            p.nome || '',
            p.cognome || '',
            p.email || '',
            p.telefono || '',
            p.azienda || '',
            p.ruolo || '',
            p.partecipanti || '',
            p.note || '',
            p.consenso || ''
        ]);

        if (NOTIFICA_A) {
            inviaNotifica(p);
        }

        return rispostaJson({ result: 'success' });

    } catch (err) {
        return rispostaJson({ result: 'error', message: String(err) });
    } finally {
        lock.releaseLock();
    }
}

/* Utile per verificare al volo che la Web App risponda:
   aprendo l'URL /exec nel browser deve comparire {"result":"ok"} */
function doGet() {
    return rispostaJson({ result: 'ok' });
}

function getFoglio() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var foglio = ss.getSheetByName(FOGLIO);

    if (!foglio) {
        foglio = ss.insertSheet(FOGLIO);
    }
    if (foglio.getLastRow() === 0) {
        foglio.appendRow(INTESTAZIONI);
        foglio.getRange(1, 1, 1, INTESTAZIONI.length).setFontWeight('bold');
        foglio.setFrozenRows(1);
        foglio.autoResizeColumns(1, INTESTAZIONI.length);
    }
    return foglio;
}

function inviaNotifica(p) {
    var oggetto = 'Nuova iscrizione — ' + (p.evento || 'evento SAV');
    var corpo =
        'Nuova iscrizione ricevuta dal sito.\n\n' +
        'Evento:        ' + (p.evento || '-') + '\n' +
        'Data evento:   ' + (p.data_evento || '-') + '\n' +
        'Luogo:         ' + (p.luogo || '-') + '\n\n' +
        'Nome:          ' + (p.nome || '-') + ' ' + (p.cognome || '') + '\n' +
        'Email:         ' + (p.email || '-') + '\n' +
        'Telefono:      ' + (p.telefono || '-') + '\n' +
        'Azienda:       ' + (p.azienda || '-') + '\n' +
        'Ruolo:         ' + (p.ruolo || '-') + '\n' +
        'Partecipanti:  ' + (p.partecipanti || '-') + '\n' +
        'Note:          ' + (p.note || '-') + '\n';

    MailApp.sendEmail(NOTIFICA_A, oggetto, corpo);
}
