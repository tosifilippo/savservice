# Iscrizioni eventi — collegamento al foglio Google

I form delle pagine evento (`eventi/*.html`) inviano i dati a un **Google Apps Script**
che scrive una riga per ogni iscrizione in un **foglio Google**, scaricabile in Excel.

Nessun limite di iscrizioni, nessun costo, i dati restano sul Drive di SAV Service.

Questa cartella (`_setup/`) non viene pubblicata online: GitHub Pages usa Jekyll,
che esclude automaticamente le cartelle che iniziano con `_`.

---

## Setup una tantum (~5 minuti)

### 1. Crea il foglio

1. Vai su [sheets.new](https://sheets.new) con l'account Google di SAV Service.
2. Rinomina il foglio, ad esempio **Iscrizioni eventi SAV**.

Non serve creare colonne o intestazioni: le scrive lo script al primo invio.

### 2. Incolla lo script

1. Nel foglio: menu **Estensioni → Apps Script**.
2. Clicca dentro `Codice.gs`, premi **`Ctrl+A`** e poi **`Canc`** per svuotarlo
   completamente, quindi incolla tutto il contenuto di
   [`apps-script-iscrizioni.gs`](apps-script-iscrizioni.gs).

   > ⚠️ Svuota davvero l'editor prima di incollare. Se resta in fondo anche solo
   > una riga della versione precedente, Google segnala un errore del tipo
   > `SyntaxError: Unexpected token '}'` a una riga **oltre la 120**, che è dove
   > finisce il file corretto. In quel caso rifai `Ctrl+A` → `Canc` → incolla.
3. **Facoltativo** — per ricevere una email a ogni iscrizione, valorizza la costante
   in cima al file:
   ```js
   var NOTIFICA_A = 'info@savservice.it';
   ```
4. Salva (icona floppy o `Ctrl+S`).

### 3. Pubblica la Web App

1. In alto a destra: **Deploy → Nuova distribuzione**.
2. Icona ingranaggio accanto a "Seleziona tipo" → **App web**.
3. Compila così:
   - **Descrizione**: `Iscrizioni eventi`
   - **Esegui come**: `Io (tuo@savservice.it)`
   - **Chi può accedere**: **`Chiunque`** ← passaggio critico
4. **Distribuisci**, poi autorizza l'accesso quando Google lo chiede.
   Alla schermata "Google non ha verificato questa app" scegli
   **Avanzate → Apri Iscrizioni eventi (non sicuro)**: è normale, l'app è tua.
5. Copia l'**URL dell'app web**, nel formato:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> ⚠️ Se "Chi può accedere" resta su *Solo io*, il browser dei visitatori riceve un
> errore di autorizzazione e le iscrizioni non arrivano.

### 4. Collega il sito

Apri [`js/evento.js`](../js/evento.js) e sostituisci il segnaposto alla riga della
costante `ENDPOINT` con l'URL copiato:

```js
var ENDPOINT = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Un solo punto da modificare: vale per tutte le pagine evento, presenti e future.

### 5. Verifica

1. Apri l'URL `/exec` nel browser: deve rispondere `{"result":"ok"}`.
2. Apri una pagina evento e invia un'iscrizione di prova.
3. Controlla che la riga compaia nel foglio, nella scheda **Iscrizioni**.
4. Cancella la riga di prova.

---

## Uso quotidiano

- **Vedere le iscrizioni**: apri il foglio Google, scheda `Iscrizioni`.
- **Esportare in Excel**: menu **File → Scarica → Microsoft Excel (.xlsx)**.
- **Filtrare per evento**: la colonna `Evento` distingue Nuoro da Olbia
  (menu **Dati → Crea un filtro**).

---

## Aggiungere un evento in futuro

1. Duplica una pagina in `eventi/` e aggiorna testi, date e i tre campi nascosti
   del form:
   ```html
   <input type="hidden" name="evento"      value="ZES Unica — Città">
   <input type="hidden" name="data_evento" value="GG/MM/AAAA">
   <input type="hidden" name="luogo"       value="Città — Sede">
   ```
2. Aggiungi la card in `index.html`, nella sezione `#eventi`.

Lo script non va toccato: le iscrizioni del nuovo evento finiscono nello stesso
foglio, distinte dalla colonna `Evento`.

---

## Modificare i campi del form

Le colonne del foglio sono definite dall'array `INTESTAZIONI` nello script e
dall'ordine dei valori in `foglio.appendRow([...])`. Se aggiungi un campo al form
HTML, aggiungilo in **entrambi** i punti dello script, poi ripubblica con
**Deploy → Gestisci distribuzioni → Modifica → Versione: Nuova versione**.

> Ripubblicare da *Gestisci distribuzioni* mantiene lo stesso URL.
> Una *Nuova distribuzione* ne genera uno diverso, da riportare in `js/evento.js`.

---

## Note

- L'URL della Web App è visibile nel codice pubblico del sito: è inevitabile per un
  sito statico. Non dà accesso al foglio, permette solo di aggiungere righe.
  Contro i bot il form ha un campo honeypot (`_gotcha`) che lo script scarta.
- Se lo script non è ancora collegato, il form mostra un messaggio che invita a
  scrivere via email, invece di fallire in silenzio.
