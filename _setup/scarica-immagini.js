/* ============================================================
   SAV Service — Ricerca e download immagini per le pagine evento
   Sorgente: Pexels (licenza libera, anche per uso commerciale,
   senza attribuzione obbligatoria — vedi pexels.com/license).

   Non richiede alcuna dipendenza: usa fetch, incluso in Node 18+.
   Il ritaglio e la compressione li fa Pexels lato server, quindi
   non serve installare nulla per elaborare le immagini.

   ── USO ──────────────────────────────────────────────────────

   1. Prendi una chiave API gratuita su https://www.pexels.com/api/
      e mettila in una variabile d'ambiente:

        PowerShell:  $env:PEXELS_KEY = "la-tua-chiave"
        Git Bash:    export PEXELS_KEY="la-tua-chiave"

      (in alternativa passala con  --key la-tua-chiave)

   2. Scarica i candidati:

        node _setup/scarica-immagini.js

      Salva 6 proposte per evento in assets/img/candidati/ e genera
      assets/img/candidati/anteprima.html: aprilo nel browser per
      vederle tutte affiancate, gia ritagliate come appariranno.

   3. Scegli i numeri che preferisci e conferma:

        node _setup/scarica-immagini.js --scegli nuoro=3 olbia=5

      Copia le immagini scelte in assets/img/ con il nome definitivo
      gia usato dalle pagine, e annota gli autori in crediti.txt.

   4. Quando hai finito puoi cancellare assets/img/candidati/.

   ── ALTRE RICERCHE ───────────────────────────────────────────

   Se le proposte non convincono, cambia la query al volo:

        node _setup/scarica-immagini.js --query nuoro="sardinia mountains"
        node _setup/scarica-immagini.js --query olbia="boat yard workers"

   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

/* ── Configurazione ─────────────────────────────────────────── */

const RADICE = path.resolve(__dirname, '..');
const CARTELLA_IMG = path.join(RADICE, 'assets', 'img');
const CARTELLA_CANDIDATI = path.join(CARTELLA_IMG, 'candidati');

/* Dimensioni delle card evento in home: 2 colonne su griglia da
   1200px, altezza foto 210px. Il doppio, per gli schermi retina. */
const LARGHEZZA = 720;
const ALTEZZA = 420;

const QUANTI_CANDIDATI = 6;

const EVENTI = {
    nuoro: {
        nomeFile: 'evento-nuoro.jpg',
        query: 'artisan workshop machinery',
        descrizione: 'Officina Incentivi 2027 — Nuoro'
    },
    olbia: {
        nomeFile: 'evento-olbia.jpg',
        query: 'boat yard craftsman working',
        descrizione: 'Officina Incentivi 2027 — Olbia'
    }
};

/* ── Lettura argomenti ──────────────────────────────────────── */

function leggiArgomenti(argv) {
    const opzioni = { key: process.env.PEXELS_KEY || '', scegli: {}, query: {} };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];

        if (a === '--key') {
            opzioni.key = argv[++i] || '';
        } else if (a === '--scegli') {
            /* --scegli nuoro=3 olbia=5 */
            while (i + 1 < argv.length && argv[i + 1].indexOf('=') !== -1 && argv[i + 1].indexOf('--') !== 0) {
                const [k, v] = argv[++i].split('=');
                opzioni.scegli[k] = parseInt(v, 10);
            }
        } else if (a === '--query') {
            while (i + 1 < argv.length && argv[i + 1].indexOf('=') !== -1 && argv[i + 1].indexOf('--') !== 0) {
                const pezzo = argv[++i];
                const k = pezzo.slice(0, pezzo.indexOf('='));
                opzioni.query[k] = pezzo.slice(pezzo.indexOf('=') + 1);
            }
        }
    }
    return opzioni;
}

/* ── Utilità ────────────────────────────────────────────────── */

function assicuraCartella(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/* Chiede a Pexels l'immagine gia ritagliata alle nostre misure:
   nessuna elaborazione locale, nessuna dipendenza da installare. */
function urlRitagliato(foto) {
    const base = foto.src.original;
    return base + '?auto=compress&cs=tinysrgb&fit=crop&w=' + LARGHEZZA + '&h=' + ALTEZZA;
}

async function cerca(chiave, query) {
    const url = 'https://api.pexels.com/v1/search'
        + '?query=' + encodeURIComponent(query)
        + '&per_page=' + QUANTI_CANDIDATI
        + '&orientation=landscape';

    const r = await fetch(url, { headers: { Authorization: chiave } });

    if (r.status === 401) throw new Error('chiave API rifiutata da Pexels — controlla PEXELS_KEY');
    if (r.status === 429) throw new Error('troppe richieste: il piano gratuito Pexels consente 200 ricerche/ora, riprova più tardi');
    if (!r.ok) throw new Error('Pexels ha risposto HTTP ' + r.status);

    const dati = await r.json();
    if (!dati.photos || dati.photos.length === 0) throw new Error('nessun risultato per "' + query + '"');
    return dati.photos;
}

async function scarica(url, destinazione) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('download fallito, HTTP ' + r.status);
    const buffer = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(destinazione, buffer);
    return buffer.length;
}

function kb(byte) { return Math.round(byte / 1024) + ' KB'; }

/* ── Modalità 1: scarica i candidati ────────────────────────── */

async function scaricaCandidati(opzioni) {
    if (!opzioni.key) {
        console.error('\nManca la chiave API Pexels.\n');
        console.error('  1. Prendine una gratis su https://www.pexels.com/api/');
        console.error('  2. Poi:  $env:PEXELS_KEY = "la-tua-chiave"      (PowerShell)');
        console.error('           export PEXELS_KEY="la-tua-chiave"      (Git Bash)');
        console.error('     oppure passala con  --key la-tua-chiave\n');
        process.exit(1);
    }

    assicuraCartella(CARTELLA_CANDIDATI);
    const raccolta = {};

    for (const slug of Object.keys(EVENTI)) {
        const evento = EVENTI[slug];
        const query = opzioni.query[slug] || evento.query;

        console.log('\n' + evento.descrizione);
        console.log('  ricerca: "' + query + '"');

        let foto;
        try {
            foto = await cerca(opzioni.key, query);
        } catch (err) {
            console.error('  ERRORE: ' + err.message);
            continue;
        }

        raccolta[slug] = [];

        for (let i = 0; i < foto.length; i++) {
            const f = foto[i];
            const numero = i + 1;
            const nome = slug + '-' + numero + '.jpg';
            const destinazione = path.join(CARTELLA_CANDIDATI, nome);

            try {
                const peso = await scarica(urlRitagliato(f), destinazione);
                console.log('  ' + numero + '. ' + nome + '  ' + kb(peso) + '  — foto di ' + f.photographer);
                raccolta[slug].push({ numero, nome, autore: f.photographer, pagina: f.url, alt: f.alt || '' });
            } catch (err) {
                console.error('  ' + numero + '. fallito: ' + err.message);
            }
        }
    }

    scriviAnteprima(raccolta);

    console.log('\n─────────────────────────────────────────────');
    console.log('Apri per scegliere:');
    console.log('  ' + path.join(CARTELLA_CANDIDATI, 'anteprima.html'));
    console.log('\nPoi conferma la scelta, per esempio:');
    console.log('  node _setup/scarica-immagini.js --scegli nuoro=3 olbia=5');
    console.log('─────────────────────────────────────────────\n');
}

/* Pagina di anteprima: mostra i candidati esattamente come
   appariranno nelle card, badge compreso. */
function scriviAnteprima(raccolta) {
    let corpo = '';

    for (const slug of Object.keys(raccolta)) {
        corpo += '<h2>' + EVENTI[slug].descrizione + '</h2>\n<div class="griglia">\n';
        for (const c of raccolta[slug]) {
            corpo += '  <figure>\n'
                + '    <div class="foto" style="background-image:linear-gradient(rgba(14,36,51,.55) 0%, rgba(14,36,51,.2) 70%, transparent 100%), url(\'' + c.nome + '\')">'
                + '<span class="badge">Iscrizioni aperte</span><span class="num">' + c.numero + '</span></div>\n'
                + '    <figcaption><strong>' + slug + '=' + c.numero + '</strong> · foto di '
                + '<a href="' + c.pagina + '" target="_blank" rel="noopener">' + c.autore + '</a></figcaption>\n'
                + '  </figure>\n';
        }
        corpo += '</div>\n';
    }

    const html = '<!DOCTYPE html>\n<html lang="it">\n<head>\n<meta charset="UTF-8">\n'
        + '<title>Candidati immagini eventi</title>\n<style>\n'
        + "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#F7FBFE;color:#10202C;margin:0;padding:40px}\n"
        + 'h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:36px 0 14px;color:#1B4F6B}\n'
        + '.sotto{color:#4B5563;font-size:14px;margin:0 0 8px}\n'
        + '.griglia{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}\n'
        + 'figure{margin:0;background:#fff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden}\n'
        + '.foto{position:relative;height:210px;background-size:cover;background-position:center}\n'
        + '.badge{position:absolute;top:12px;left:12px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;'
        + 'text-transform:uppercase;letter-spacing:.05em;background:rgba(81,163,210,.3);color:#fff;border:1px solid rgba(255,255,255,.45)}\n'
        + '.num{position:absolute;bottom:10px;right:12px;font-size:26px;font-weight:800;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6)}\n'
        + 'figcaption{padding:12px 14px;font-size:13px;color:#4B5563}\n'
        + 'code{background:#E6F1F9;padding:2px 6px;border-radius:4px}\n'
        + '</style>\n</head>\n<body>\n'
        + '<h1>Candidati immagini eventi</h1>\n'
        + '<p class="sotto">Ritagliate come appariranno nelle card della home. Scegli un numero per evento e conferma con:<br>'
        + '<code>node _setup/scarica-immagini.js --scegli nuoro=N olbia=N</code></p>\n'
        + corpo
        + '</body>\n</html>\n';

    fs.writeFileSync(path.join(CARTELLA_CANDIDATI, 'anteprima.html'), html);
}

/* ── Modalità 2: conferma la scelta ─────────────────────────── */

function confermaScelta(opzioni) {
    let fatti = 0;
    const crediti = [];

    for (const slug of Object.keys(opzioni.scegli)) {
        if (!EVENTI[slug]) {
            console.error('  evento sconosciuto: "' + slug + '" (attesi: ' + Object.keys(EVENTI).join(', ') + ')');
            continue;
        }

        const numero = opzioni.scegli[slug];
        const origine = path.join(CARTELLA_CANDIDATI, slug + '-' + numero + '.jpg');

        if (!fs.existsSync(origine)) {
            console.error('  non trovo ' + path.basename(origine) + ' — hai gia scaricato i candidati?');
            continue;
        }

        const destinazione = path.join(CARTELLA_IMG, EVENTI[slug].nomeFile);
        fs.copyFileSync(origine, destinazione);
        const peso = fs.statSync(destinazione).size;
        console.log('  ' + EVENTI[slug].nomeFile + '  ' + kb(peso) + '  (candidato ' + slug + '-' + numero + ')');
        crediti.push(EVENTI[slug].nomeFile + ' — ' + slug + '-' + numero + ' da Pexels');
        fatti++;
    }

    if (fatti > 0) {
        fs.writeFileSync(
            path.join(CARTELLA_IMG, 'crediti-immagini.txt'),
            'Immagini eventi — origine Pexels (pexels.com/license)\n'
            + 'Licenza libera, uso commerciale consentito, attribuzione non obbligatoria.\n\n'
            + crediti.join('\n') + '\n\n'
            + 'Gli autori delle singole foto sono elencati in assets/img/candidati/anteprima.html\n'
        );
        console.log('\n' + fatti + ' immagini messe in assets/img/.');
        console.log('Le pagine e le card le usano gia con questi nomi: ricarica il sito per vederle.');
        console.log('Puoi cancellare assets/img/candidati/ quando hai finito.\n');
    }
}

/* ── Avvio ──────────────────────────────────────────────────── */

(async function () {
    const opzioni = leggiArgomenti(process.argv.slice(2));

    if (Object.keys(opzioni.scegli).length > 0) {
        confermaScelta(opzioni);
    } else {
        await scaricaCandidati(opzioni);
    }
})().catch(function (err) {
    console.error('\nErrore: ' + err.message + '\n');
    process.exit(1);
});
