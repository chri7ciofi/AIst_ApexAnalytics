<div align="center">
  <h1>🏎️ ApexAnalytics</h1>
  <p><strong>F1 Intelligence Dashboard</strong></p>
</div>

# ApexAnalytics 🏎️📊

ApexAnalytics è un'applicazione completa per la Formula 1 che fornisce telemetria in tempo reale, insight strategici basati sull'Intelligenza Artificiale, calendari delle gare, classifiche piloti/costruttori e le ultime notizie dal paddock. Costruita con uno stack web moderno, offre una dashboard ad alte prestazioni, responsiva e visivamente straordinaria per appassionati e analisti di F1.

> **Nota:** [Visualizza la tua app direttamente in AI Studio!](https://ai.studio/apps/90e1e56d-94d9-4f39-b8f7-19570cf4f6b8)

---

## ✨ Funzionalità

- **📊 Dashboard Telemetria in Tempo Reale:** Visualizza i dati telemetrici in tempo reale (o d'archivio) per le sessioni di F1, mostrando velocità, acceleratore, freni e marce tramite grafici interattivi.
- **🧠 Predittore Strategico AI:** Sfrutta **Google Gemini 2.5 Flash** per ottenere consigli strategici deterministici e di livello esperto basati sui dati attuali della gara e sul degrado degli pneumatici.
- **📅 Calendario Gare 2026:** Calendario completo e preciso del campionato di Formula 1 2026, con analisi esatta degli orari delle sessioni che evita discrepanze relative al fuso orario del client.
- **📰 Aggregatore di Notizie F1:** Rimani aggiornato con le ultime notizie di F1 ottenute tramite feed RSS dalle principali testate giornalistiche dedicate ai motori (Motorsport, FormulaPassion, F1.com), deduplicate in modo intelligente.
- **🏆 Classifiche di Campionato:** Classifiche aggiornate per piloti e costruttori.
- **📚 Archivio e Regolamenti:** Dati storici di F1 e approfondimenti riguardanti i regolamenti FIA.

## 🛠️ Tech Stack

**Frontend:**

- **React 19** & **Vite**: Framework frontend e bundler ultra-veloci.
- **Tailwind CSS v4**: Styling utility-first per un'interfaccia elegante, a tema scuro e responsiva.
- **Framer Motion**: Transizioni di pagina fluide e micro-animazioni.
- **Recharts**: Libreria di grafici ad alte prestazioni per la visualizzazione della telemetria.
- **Lucide React**: Iconografia accattivante e coerente.

**Backend:**

- **Express.js (TypeScript)**: Server custom che gestisce le integrazioni API e funge da proxy per le richieste, aggirando le restrizioni CORS.
- **Google GenAI SDK**: Integrazione con Gemini 2.5 Flash per il chatbot basato sull'AI.
- **RSS-Parser & Axios**: Strumenti robusti per il recupero dei dati.
- **Caching in-memory:** Caching basilare lato server (es. per l'API OpenF1 e le Notizie) per ridurre le richieste alle API esterne e abbattere i tempi di caricamento.

**API Esterne:**

- [OpenF1.org API](https://openf1.org) per i dati telemetrici.
- Google Gemini API.

---

## 🚀 Per Iniziare

### Prerequisiti

Assicurati di avere i seguenti strumenti installati sul tuo computer locale:

- **Node.js** (v18 o superiore raccomandato)
- **npm** (oppure yarn/pnpm)

### Installazione

1. **Clona il repository / Naviga nella cartella del progetto:**

   ```bash
   cd AIst_ApexAnalytics
   ```

2. **Installa le dipendenze:**

   ```bash
   npm install
   ```

3. **Configura le Variabili d'Ambiente:**
   Crea un file `.env.local` (oppure `.env`) nella root del progetto e aggiungi la tua chiave API di Gemini:

   ```env
   GEMINI_API_KEY=la_tua_google_gemini_api_key_qui
   ```

4. **Avvia il Server di Sviluppo:**
   Il progetto utilizza `tsx` per eseguire il backend Express e il server statico Vite simultaneamente.

   ```bash
   npm run dev
   ```

5. **Apri l'App:**
   Vai all'indirizzo `http://localhost:3000` nel tuo browser web.

---

## 📁 Struttura del Progetto

- `/src`
  - `/components` - Componenti UI riutilizzabili (Sidebar, Charts, Cards).
  - `/pages` - Viste principali (Telemetria, Strategia, Calendario, Classifiche, Notizie, Archivio).
  - `/data` - Dati statici strutturati (es., `calendar2026.ts`).
- `server.ts` - L'applicazione backend Express che gestisce il routing, il proxy dell'API OpenF1, l'endpoint per la strategia Gemini e il parsing RSS.
- `package.json` - Metadati e dipendenze del progetto.
