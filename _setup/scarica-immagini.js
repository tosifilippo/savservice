/* ============================================================
   SAV Service — Ricerca e download immagini per le pagine evento

   Due sorgenti, entrambe con immagini utilizzabili commercialmente:

     commons  Wikimedia Commons. Non richiede chiave, funziona subito.
              Le licenze (CC BY, CC BY-SA, CC0, pubblico dominio)
              consentono l'uso commerciale ma quasi sempre chiedono
              di citare l'autore: lo script scrive i crediti in
              assets/img/crediti-immagini.txt.

     pexels   Pexels. Richiede una chiave API gratuita ma le foto
              sono di taglio più pubblicitario e non serve
              attribuzione. Chiave su https://www.pexels.com/api/

   Senza chiave usa commons, con chiave usa pexels. Si può forzare
   con --fonte commons|pexels.

   Nessuna dipendenza da installare: usa fetch, incluso in Node 18+.

   ── USO ──────────────────────────────────────────────────────

   1. Scarica i candidati:

        node _setup/scarica-immagini.js

      Salva 6 proposte per evento in assets/img/candidati/ e genera
      assets/img/candidati/anteprima.html: aprilo nel browser per
      vederle tutte affiancate, gia ritagliate come appariranno
      nelle card, badge compreso.

   2. Scegli i numeri che preferisci e conferma:

        node _setup/scarica-immagini.js --scegli nuoro=3 olbia=5

      Copia le immagini scelte in assets/img/ con il nome definitivo
      gia usato dalle pagine e aggiorna i crediti.

   3. Quando hai finito puoi cancellare assets/img/candidati/.

   ── OPZIONI ──────────────────────────────────────────────────

     --fonte commons|pexels    forza la sorgente
     --key CHIAVE              chiave Pexels (o variabile PEXELS_KEY)
     --query nuoro="..."       cambia la ricerca di un evento

   Esempi:

     node _setup/scarica-immagini.js --query nuoro="Barbagia paesaggio"
     node _setup/scarica-immagini.js --fonte pexels --key abc123

   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

/* ── Configurazione ─────────────────────────────────────────── */

const RADICE = path.resolve(__dirname, '..');
const CARTELLA_IMG = path.join(RADICE, 'assets', 'img');
const CARTELLA_CANDIDATI = path.join(CARTELLA_IMG, 'candidati');

/* Le card mostrano la foto a 210px di altezza su circa 590px di
   larghezza. Scarichiamo a 900px: nitido anche su schermi retina
   senza appesantire la pagina. Il ritaglio lo fa la CSS, con
   background-size:cover. */
const LARGHEZZA = 900;
const QUANTI_CANDIDATI = 6;

const UA = 'savservice-site/1.0 (https://savservice.it; amministrazione@savservice.it)';

const EVENTI = {
    nuoro: {
        nomeFile: 'evento-nuoro.jpg',
        descrizione: 'Officina Incentivi 2027 — Nuoro',
        queryCommons: 'Nuoro Sardinia',
        queryPexels: 'artisan workshop machinery'
    },
    olbia: {
        nomeFile: 'evento-olbia.jpg',
        descrizione: 'Officina Incentivi 2027 — Olbia',
        queryCommons: 'Olbia porto Sardegna',
        queryPexels: 'boat yard craftsman working'
    }
};

/* ── Lettura argomenti ──────────────────────────────────────── */

function leggiArgomenti(argv) {
    const o = { key: process.env.PEXELS_KEY || '', fonte: '', scegli: {}, query: {} };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];

        if (a === '--key') {
            o.key = argv[++i] || '';
        } else if (a === '--fonte') {
            o.fonte = (argv[++i] || '').toLowerCase();
        } else if (a === '--scegli' || a === '--query') {
            const dove = a === '--scegli' ? o.scegli : o.query;
            while (i + 1 < argv.length && argv[i + 1].indexOf('=') !== -1 && argv[i + 1].indexOf('--') !== 0) {
                const p = argv[++i];
                const k = p.slice(0, p.indexOf('='));
                const v = p.slice(p.indexOf('=') + 1);
                dove[k] = (a === '--scegli') ? parseInt(v, 10) : v;
            }
        }
    }

    if (!o.fonte) o.fonte = o.key ? 'pexels' : 'commons';
    return o;
}

/* ── Utilità ────────────────────────────────────────────────── */

function assicuraCartella(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function kb(byte) { return Math.round(byte / 1024) + ' KB'; }

/* I metadati di Commons arrivano in HTML: ne ricaviamo il testo */
function testoSemplice(html) {
    if (!html) return '';
    return String(html)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function scarica(url, destinazione) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('download fallito, HTTP ' + r.status);
    const buffer = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(destinazione, buffer);
    return buffer.length;
}

/* ── Sorgente: Wikimedia Commons (senza chiave) ─────────────── */

async function cercaCommons(query) {
    const url = 'https://commons.wikimedia.org/w/api.php'
        + '?action=query&format=json&origin=*'
        + '&generator=search&gsrnamespace=6&gsrlimit=40'
        + '&gsrsearch=' + encodeURIComponent(query)
        + '&prop=imageinfo&iiprop=url|extmetadata|size|mime'
        + '&iiurlwidth=' + LARGHEZZA;

    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('Commons ha risposto HTTP ' + r.status);

    const dati = await r.json();
    const pagine = dati.query && dati.query.pages;
    if (!pagine) throw new Error('nessun risultato per "' + query + '"');

    /* generator=search non garantisce l'ordine: lo ripristiniamo con index */
    const risultati = Object.keys(pagine)
        .map(function (k) { return pagine[k]; })
        .sort(function (a, b) { return (a.index || 0) - (b.index || 0); });

    const buone = [];

    for (const p of risultati) {
        const info = p.imageinfo && p.imageinfo[0];
        if (!info || !info.thumburl) continue;
        if (info.mime !== 'image/jpeg' && info.mime !== 'image/png') continue;

        /* solo orizzontali con proporzioni adatte alla card */
        if (!(info.width > info.height * 1.2)) continue;
        if (info.width < 900) continue;

        const meta = info.extmetadata || {};
        const licenza = testoSemplice(meta.LicenseShortName && meta.LicenseShortName.value) || 'licenza non dichiarata';

        /* scartiamo tutto ciò che non consente l'uso commerciale */
        if (/non-?commercial|\bNC\b/i.test(licenza)) continue;

        buone.push({
            url: info.thumburl,
            autore: testoSemplice(meta.Artist && meta.Artist.value) || 'autore non indicato',
            licenza: licenza,
            pagina: info.descriptionurl || '',
            titolo: testoSemplice(p.title || '').replace(/^File:/, '')
        });

        if (buone.length >= QUANTI_CANDIDATI) break;
    }

    if (buone.length === 0) throw new Error('nessuna immagine orizzontale adatta per "' + query + '"');
    return buone;
}

/* ── Sorgente: Pexels (con chiave) ──────────────────────────── */

async function cercaPexels(chiave, query) {
    const url = 'https://api.pexels.com/v1/search'
        + '?query=' + encodeURIComponent(query)
        + '&per_page=' + QUANTI_CANDIDATI
        + '&orientation=landscape';

    const r = await fetch(url, { headers: { Authorization: chiave } });

    if (r.status === 401) throw new Error('chiave API rifiutata da Pexels — controlla PEXELS_KEY');
    if (r.status === 429) throw new Error('troppe richieste: il piano gratuito consente 200 ricerche/ora, riprova più tardi');
    if (!r.ok) throw new Error('Pexels ha risposto HTTP ' + r.status);

    const dati = await r.json();
    if (!dati.photos || dati.photos.length === 0) throw new Error('nessun risultato per "' + query + '"');

    return dati.photos.map(function (f) {
        return {
            url: f.src.original + '?auto=compress&cs=tinysrgb&fit=crop&w=' + LARGHEZZA + '&h=' + Math.round(LARGHEZZA * 7 / 12),
            autore: f.photographer,
            licenza: 'Pexels License (attribuzione non obbligatoria)',
            pagina: f.url,
            titolo: f.alt || ''
        };
    });
}

/* ── Modalità 1: scarica i candidati ────────────────────────── */

async function scaricaCandidati(o) {
    console.log('\nSorgente: ' + o.fonte + (o.fonte === 'commons' ? '  (nessuna chiave necessaria)' : ''));

    if (o.fonte === 'pexels' && !o.key) {
        console.error('\nLa sorgente pexels richiede una chiave API.');
        console.error('  Prendine una gratis su https://www.pexels.com/api/ e poi:');
        console.error('    $env:PEXELS_KEY = "la-tua-chiave"      (PowerShell)');
        console.error('    export PEXELS_KEY="la-tua-chiave"      (Git Bash)');
        console.error('  Oppure usa Wikimedia Commons:  --fonte commons\n');
        process.exit(1);
    }

    assicuraCartella(CARTELLA_CANDIDATI);
    const raccolta = {};
    let totale = 0;

    for (const slug of Object.keys(EVENTI)) {
        const ev = EVENTI[slug];
        const query = o.query[slug] || (o.fonte === 'commons' ? ev.queryCommons : ev.queryPexels);

        console.log('\n' + ev.descrizione);
        console.log('  ricerca: "' + query + '"');

        let trovate;
        try {
            trovate = o.fonte === 'commons'
                ? await cercaCommons(query)
                : await cercaPexels(o.key, query);
        } catch (err) {
            console.error('  ERRORE: ' + err.message);
            continue;
        }

        raccolta[slug] = [];

        for (let i = 0; i < trovate.length; i++) {
            const t = trovate[i];
            const numero = i + 1;
            const nome = slug + '-' + numero + '.jpg';

            try {
                const peso = await scarica(t.url, path.join(CARTELLA_CANDIDATI, nome));
                console.log('  ' + numero + '. ' + nome + '  ' + kb(peso) + '  — ' + t.autore + '  [' + t.licenza + ']');
                raccolta[slug].push(Object.assign({ numero, nome, peso }, t));
                totale++;
            } catch (err) {
                console.error('  ' + numero + '. fallito: ' + err.message);
            }
        }
    }

    if (totale === 0) {
        console.error('\nNessuna immagine scaricata.\n');
        process.exit(1);
    }

    scriviAnteprima(raccolta, o.fonte);
    salvaRaccolta(raccolta);

    console.log('\n─────────────────────────────────────────────');
    console.log('Apri per scegliere:');
    console.log('  ' + path.join(CARTELLA_CANDIDATI, 'anteprima.html'));
    console.log('\nPoi conferma, per esempio:');
    console.log('  node _setup/scarica-immagini.js --scegli nuoro=3 olbia=5');
    console.log('─────────────────────────────────────────────\n');
}

/* I metadati servono dopo, per scrivere i crediti della sola
   immagine scelta: li mettiamo da parte accanto ai candidati. */
function salvaRaccolta(raccolta) {
    fs.writeFileSync(
        path.join(CARTELLA_CANDIDATI, 'metadati.json'),
        JSON.stringify(raccolta, null, 2)
    );
}

/* Pagina di anteprima: i candidati dentro la card vera, così la
   scelta si fa sul risultato finale e non sui nomi dei file. */
function scriviAnteprima(raccolta, fonte) {
    let corpo = '';

    for (const slug of Object.keys(raccolta)) {
        corpo += '<h2>' + EVENTI[slug].descrizione + '</h2>\n<div class="griglia">\n';
        for (const c of raccolta[slug]) {
            const link = c.pagina
                ? '<a href="' + c.pagina + '" target="_blank" rel="noopener">' + c.autore + '</a>'
                : c.autore;
            corpo += '  <figure>\n'
                + '    <div class="foto" style="background-image:linear-gradient(rgba(14,36,51,.55) 0%, rgba(14,36,51,.2) 70%, transparent 100%), url(\'' + c.nome + '\')">'
                + '<span class="badge">Iscrizioni aperte</span><span class="num">' + c.numero + '</span></div>\n'
                + '    <figcaption><strong>' + slug + '=' + c.numero + '</strong> · ' + kb(c.peso) + '<br>'
                + link + '<br><span class="lic">' + c.licenza + '</span></figcaption>\n'
                + '  </figure>\n';
        }
        corpo += '</div>\n';
    }

    const html = '<!DOCTYPE html>\n<html lang="it">\n<head>\n<meta charset="UTF-8">\n'
        + '<title>Candidati immagini eventi</title>\n<style>\n'
        + "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#F7FBFE;color:#10202C;margin:0;padding:40px}\n"
        + 'h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:36px 0 14px;color:#1B4F6B}\n'
        + '.sotto{color:#4B5563;font-size:14px;margin:0 0 8px;line-height:1.6}\n'
        + '.griglia{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}\n'
        + 'figure{margin:0;background:#fff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden}\n'
        + '.foto{position:relative;height:210px;background-color:#1B4F6B;background-size:cover;background-position:center}\n'
        + '.badge{position:absolute;top:12px;left:12px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;'
        + 'text-transform:uppercase;letter-spacing:.05em;background:rgba(81,163,210,.3);color:#fff;border:1px solid rgba(255,255,255,.45)}\n'
        + '.num{position:absolute;bottom:10px;right:12px;font-size:26px;font-weight:800;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6)}\n'
        + 'figcaption{padding:12px 14px;font-size:13px;color:#4B5563;line-height:1.5}\n'
        + '.lic{color:#9CA3AF;font-size:12px}\n'
        + 'code{background:#E6F1F9;padding:2px 6px;border-radius:4px}\n'
        + '</style>\n</head>\n<body>\n'
        + '<h1>Candidati immagini eventi</h1>\n'
        + '<p class="sotto">Sorgente: <strong>' + fonte + '</strong>. Ritagliate come appariranno nelle card della home.<br>'
        + 'Scegli un numero per evento e conferma con '
        + '<code>node _setup/scarica-immagini.js --scegli nuoro=N olbia=N</code></p>\n'
        + corpo
        + '</body>\n</html>\n';

    fs.writeFileSync(path.join(CARTELLA_CANDIDATI, 'anteprima.html'), html);
}

/* ── Modalità 2: conferma la scelta ─────────────────────────── */

function confermaScelta(o) {
    let raccolta = {};
    const fileMeta = path.join(CARTELLA_CANDIDATI, 'metadati.json');
    if (fs.existsSync(fileMeta)) {
        try { raccolta = JSON.parse(fs.readFileSync(fileMeta, 'utf8')); } catch (err) { /* pazienza */ }
    }

    const crediti = [];
    let fatti = 0;

    for (const slug of Object.keys(o.scegli)) {
        if (!EVENTI[slug]) {
            console.error('  evento sconosciuto: "' + slug + '" (attesi: ' + Object.keys(EVENTI).join(', ') + ')');
            continue;
        }

        const numero = o.scegli[slug];
        const origine = path.join(CARTELLA_CANDIDATI, slug + '-' + numero + '.jpg');

        if (!fs.existsSync(origine)) {
            console.error('  non trovo ' + path.basename(origine) + ' — hai gia scaricato i candidati?');
            continue;
        }

        const destinazione = path.join(CARTELLA_IMG, EVENTI[slug].nomeFile);
        fs.copyFileSync(origine, destinazione);
        console.log('  ' + EVENTI[slug].nomeFile + '  ' + kb(fs.statSync(destinazione).size)
            + '  (candidato ' + slug + '-' + numero + ')');

        const m = (raccolta[slug] || []).find(function (c) { return c.numero === numero; });
        crediti.push(
            EVENTI[slug].nomeFile + '\n'
            + '    evento:   ' + EVENTI[slug].descrizione + '\n'
            + '    autore:   ' + (m ? m.autore : 'da verificare') + '\n'
            + '    licenza:  ' + (m ? m.licenza : 'da verificare') + '\n'
            + '    origine:  ' + (m && m.pagina ? m.pagina : 'da verificare')
        );
        fatti++;
    }

    if (fatti > 0) {
        fs.writeFileSync(
            path.join(CARTELLA_IMG, 'crediti-immagini.txt'),
            'Crediti immagini — pagine evento SAV Service\n'
            + 'Generato da _setup/scarica-immagini.js\n\n'
            + 'Le licenze CC BY e CC BY-SA consentono l\'uso commerciale ma richiedono\n'
            + 'di citare autore e licenza. Se usi immagini con queste licenze, riporta\n'
            + 'i crediti qui sotto in una pagina del sito (o nella pagina evento).\n\n'
            + crediti.join('\n\n') + '\n'
        );
        console.log('\n' + fatti + ' immagini messe in assets/img/.');
        console.log('Crediti in assets/img/crediti-immagini.txt — controllali: alcune licenze');
        console.log('richiedono di citare l\'autore sul sito.');
        console.log('Puoi cancellare assets/img/candidati/ quando hai finito.\n');
    }
}

/* ── Avvio ──────────────────────────────────────────────────── */

(async function () {
    const o = leggiArgomenti(process.argv.slice(2));
    if (Object.keys(o.scegli).length > 0) confermaScelta(o);
    else await scaricaCandidati(o);
})().catch(function (err) {
    console.error('\nErrore: ' + err.message + '\n');
    process.exit(1);
});
