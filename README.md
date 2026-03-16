<div align="center">
  <h1>🏎️ ApexAnalytics</h1>
  <p><strong>La Dashboard di Intelligence Definitiva per la Formula 1</strong></p>
</div>

---

## 📖 Panoramica

**ApexAnalytics** è una piattaforma web super-veloce e completa, progettata per gli ingegneri "da divano", gli appassionati sfegatati e gli analisti veri e propri della Formula 1. Più che un semplice raccoglitore di notizie o classifiche, l'applicazione ambisce a fornire un'esperienza da *Muretto Box* direttamente al tuo browser.

Con ApexAnalytics puoi visualizzare in tempo reale i dati crudi di telemetria, consultare le ultime indiscrezioni del paddock e, soprattutto, confrontarti con un assistente IA specializzato nella previsione delle strategie di gara, analizzando il degrado degli pneumatici e suggerendo i momenti ideali per il pit-stop.

> **Prova l'applicazione in azione:** [Visualizza l'app live in AI Studio!](https://ai.studio/apps/90e1e56d-94d9-4f39-b8f7-19570cf4f6b8)

---

## ✨ Funzionalità Dettagliate

### 📊 Dashboard Telemetria in Tempo Reale
- **Cosa fa:** Estrae le metriche di guida pure, come la velocità (km/h), la percentuale di pressione sull'acceleratore, l'uso dei freni e la marcia inserita, curva dopo curva.
- **Come funziona:** Sfrutta i dati telemetrici messi a disposizione dall'API OpenF1. Attraverso grafici interattivi e sincronizzati sviluppati con *Recharts*, il sito permette un'analisi visiva immediata: puoi, ad esempio, paragonare il giro in qualifica di Leclerc e Verstappen per capire esattamente dove uno dei due ha guadagnato millesimi preziosi in frenata o accelerazione.

### 🧠 Predittore Strategico AI
- **Cosa fa:** Risponde al classico dilemma delle domeniche di gara: "Quando è il momento giusto per rientrare ai box (pit-stop)?".
- **Come funziona:** Usa il motore neurale di **Google Gemini 2.5 Flash**. Inviando all'IA i dati sul degrado istantaneo stimato delle gomme e istruendo il modello a comportarsi come un *Ingegnere di Pista*, il sistema genera risposte strategiche veloci, altamente deterministiche (con `Temperatura = 0`) basate sul calcolo del ritmo di gara residuo. 

### 📅 Calendario Gran Premi 2026 Ultra-Preciso
- **Cosa fa:** Fornisce una vista chiara e dettagliata in stile "timeline" di ogni evento del finesettimana, dalle sole FP1/FP2/FP3 alle Qualifiche, le Sprint Race e la Gara.
- **Come funziona:** Impiega un sistema di memorizzazione controllata delle date (nel file `calendar2026.ts`) specificamente configurato per prevenire classici bug causati dai timezone lato client (i famosi salti di data errati dovuti al fuso orario del browser utente), assicurando estrema precisione.

### 📰 Aggregatore Notizie F1 Intelligente
- **Cosa fa:** Raccoglie gli ultimi lanci d'agenzia da testate storiche quali *Motorsport*, *FormulaPassion* e la stessa *F1.com*.
- **Come funziona:** Non si limita a scaricare i link RSS ciecamente. Il server (sviluppato in Express) raccoglie le top-news giornaliere, applica un sistema caching di 12 ore e passa attraverso una rudimentale logica di deduplicazione per nascondere articoli di testate differenti che parlano esattamente dello stesso fatto/titolano allo stesso modo (evitando fastidiosi cloni sulla home).

### 🏆 Info Addizionali: Classifiche e Archivi FIA
- **Cosa fa:** Ospita le visuali del tabellone d'oro per le posizioni Piloti e Costruttori in gara.
- **Cosa fa / extra:** Include un mockup delle direttive e regolamentazioni sportive/tecniche emanate dalla FIA (necessarie come base d'uso per espandere il motore IA).

---

## 🛠️ Architettura e Tech Stack Spiegati

L'applicazione segue un pattern Modern-Monolith. Utilizza una sola code-base per far dialogare un Front-End "reattivo" con un Back-End dedicato e ottimizzato per evitare i limiti di browser e API esterne.

### 1) Frontend (Il Cruscotto - L'interfaccia)
- **Vite & React 19:** Fondamentali per un caricamento della pagina istantaneo. La navigazione tabulare garantisce all'utente transizioni immediate senza che la pagina debba essere mai ricaricata integralmente.
- **Tailwind CSS v4:** Styling a componenti (niente conflitti di classi globali CSS). Permette la gestione totale dei colori per riprodurre lo stile "Racing / Muretto Box" su sfondi scuri ergonomici (Zinc/Neutral Dark Mode).
- **Framer Motion:** Aggiunge transizioni scorrevoli tra i componenti. Quando muovi la dashboard per entrare in altre pagine, l'effetto *swipe* riflette il senso di velocità intrinseco della F1.
- **Recharts & Lucide React:** Per tracciare la telemetria con decine di input al secondo senza crashare il browser del telefono (Recharts SVG based) e dare al sito un look iconografico pulito.

### 2) Backend (Il Motore e l'Ingegnere)
- **Express.js (TypeScript):** Il piccolo e vitale server Node. Non solo serve l'app Vite (frontend), ma compie dei task essenziali:
  1. **Proxy Anti-CORS:** Il browser web bloccherebbe le richieste ai server crudi di "*OpenF1*". Express fa da fiduciario, prende i dati per te e te li consegna.
  2. **Security & API Keys:** Il frontend non contiene la chiave Gemini in chiaro; spetta ad Express comunicare col server AI per scongiurare furti di chiavi API.
  3. **Limitazione e Cache:** I dati RSS e i pacchetti di telemetria pesanti (megabytes a richiesta) vengono salvati con scadenze TTL definite nella RAM locale per non violare i limite rateale di download sui server F1. 

---

## 🚀 Guida all'Installazione (Setup per Sviluppatori)

Vuoi mettere mano ai codici, implementare l'API di un tuo driver preferito o spingere l'Ingegnere AI su un modello più potente? Segui questa guida.

### Prerequisiti Base
Il tuo PC/Mac deve avere a disposizione:
- **Node.js** (Ambiente Runtime JS, versione v18+ altamente consigliata)
- **npm** (O gestore analogo come yarn/pnpm, già incluso con Node.js)

### Instruzioni Setup Locale

1. **Clona la Directory del Progetto e spostati all'interno:**
   Lanciando il terminale, digita:
   ```bash
   cd AIst_ApexAnalytics
   ```

2. **Installa tutte le Dipendenze dei pacchetti node:**
   ```bash
   npm install
   ```

3. **Crea il tuo Badge di Accesso Sicuro all'IA:**
   Il sito richiede l'autenticazione a Google per fornire previsioni strategiche.
   Nel folder principale, posizionato accanto al file `package.json`, crea un file di testo nascono chiamandolo `.env.local` (oppure `.env`). Scrivi al suo interno:
   ```env
   GEMINI_API_KEY=inserisci_qui_la_tua_google_gemini_api_key_autentica
   ```

4. **Avvia il Motore e comincia a navigare:**
   Il nostro script avvia in automatico sia il server *Express* sia il watcher del frontend *Vite* agganciandoli uno all'altro in modo invisibile, tramite "tsx":
   ```bash
   npm run dev
   ```

5. **Accendi il semaforo verde:**
   Apri Chrome o Safari ed entra in Pista dirigendoti su `http://localhost:3000`.

---

## 📁 La Mappa dei Componenti (Struttura Base di Codice)

Una veloce guida per capire "che cosa modifica cosa" senza perdersi in centinaia di righe di codice:

- `/src/components/` - I veri bottoni fisici e i widget. Contiene i grafici (`Charts`, usando Recharts), e la colonna laterale (`Sidebar.tsx`) per la navigazione.
- `/src/pages/` - Sono i "Quadri degli indicatori". Contengono l'interfaccia unica di ogni singola View raggiungibile (ad es.: `Strategy.tsx` manda messaggi in chat, `Telemetry.tsx` visualizza i dati crudi).
- `/src/data/` - Hard-storage di dati statici immutabili come date legali e info di test fisso (ad es.: `calendar2026.ts`).
- `server.ts` - **[CUORE PULSANTE]** È l'applicazione Express (Backend/Proxy). Qua dentro trovi le logiche di caching, di interrogazione dei feed RSS (`/api/news`), l'aggancio a Gemini (`/api/ai/strategy`) e l'impalcatura che fa da proxy a `openf1.org` (`/api/openf1/*`).
- `package.json` - L'inventario della monoposto; indica versioni e moduli NodeJS necessari.
- `index.html` - Lo scheletro iniziale della vista client, provvisto di Metadati SEO primari.
