<div align="center">
  <img width="1200" height="475" alt="ApexAnalytics Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ApexAnalytics 🏎️📊

ApexAnalytics is a comprehensive Formula 1 application that provides live telemetry, strategic insights powered by AI, race calendars, driver/constructor standings, and the latest news from the paddocks. Built with a modern web stack, it offers a high-performance, responsive, and visually stunning dashboard for F1 enthusiasts and analysts alike.

---

## ✨ Features

- **📊 Live Telemetry Dashboard:** View real-time (or archived) telemetry data for F1 sessions, visualizing speed, throttle, brake, and gear data using interactive charts.
- **🧠 AI Strategy Predictor:** Leverage **Google Gemini 2.5 Flash** to get deterministic, expert-level strategic recommendations based on current race data and tyre degradation.
- **📅 2026 Race Calendar:** Complete and extremely precise 2026 Formula 1 schedule, accurately parsing session times and avoiding client-side timezone discrepancies.
- **📰 F1 News Aggregator:** Stay updated with the latest F1 news fetched via RSS feeds from top motorsport publications (Motorsport, FormulaPassion, F1.com), smartly deduplicated.
- **🏆 Championship Standings:** Up-to-date driver and constructor standings.
- **📚 Archive & Regulations:** Historical F1 data and insights regarding F1 regulations.

## 🛠️ Tech Stack

**Frontend:**

- **React 19** & **Vite**: Ultra-fast frontend framework and bundler.
- **Tailwind CSS v4**: Utility-first styling for a sleek, dark-themed, and responsive UI.
- **Framer Motion**: Smooth page transitions and micro-animations.
- **Recharts**: High-performance charting library for telemetry visualization.
- **Lucide React**: Beautiful and consistent iconography.

**Backend:**

- **Express.js (TypeScript)**: Custom server handling API integrations and proxying requests to bypass CORS restrictions.
- **Google GenAI SDK**: Integration with Gemini 2.5 Flash for the AI Strategy Chatbot.
- **RSS-Parser & Axios**: Robust data fetching capabilities.
- **In-Memory Caching:** Basic server-side caching (e.g., for OpenF1 API and News) to reduce external API pressure and improve load times.

**External APIs:**

- [OpenF1.org API](https://openf1.org) for telemetry data.
- Google Gemini API.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:

- **Node.js** (v18 or higher recommended)
- **npm** (or yarn/pnpm)

### Installation

1. **Clone the repository / Navigate to the project folder:**

   ```bash
   cd AIst_ApexAnalytics
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` (or `.env`) file in the root of the project and add your Gemini API Key:

   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Run the Development Server:**
   The project uses `tsx` to run the Express backend and the Vite static server concurrently.

   ```bash
   npm run dev
   ```

5. **Open the App:**
   Navigate to `http://localhost:3000` in your web browser.

---

## 📁 Project Structure

- `/src`
  - `/components` - Reusable UI components (Sidebar, Charts, Cards).
  - `/pages` - Core views (Telemetry, Strategy, Calendar, Standings, News, Archive).
  - `/data` - Static structured data (e.g., `calendar2026.ts`).
- `server.ts` - The Express backend application handling routing, the OpenF1 API proxy, the Gemini strategy endpoint, and RSS parsing.
- `package.json` - Project metadata and dependencies.
