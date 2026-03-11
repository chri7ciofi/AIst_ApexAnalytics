import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

// Simple in-memory cache
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy to OpenF1 API to avoid CORS issues and add caching
  app.get("/api/openf1/*", async (req, res) => {
    try {
      const path = req.params[0];
      
      // Extract limit if present, remove from query sent to OpenF1
      // OpenF1 API returns 404 if limit parameter is used
      let limit = 0;
      const queryObj = { ...req.query };
      if (queryObj.limit) {
        limit = parseInt(queryObj.limit as string, 10);
        delete queryObj.limit;
      }
      
      const query = new URLSearchParams(queryObj as Record<string, string>).toString();
      const url = `https://api.openf1.org/v1/${path}${query ? "?" + query : ""}`;
      console.log("OpenF1 Proxy URL:", url);
      
      // Check cache
      const cached = cache.get(url);
      let data;
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        data = cached.data;
      } else {
        const response = await axios.get(url);
        data = response.data;
        // Save to cache
        cache.set(url, { data, timestamp: Date.now() });
      }
      
      // Apply limit locally if requested
      if (limit > 0 && Array.isArray(data)) {
        return res.json(data.slice(0, limit));
      }
      
      res.json(data);
    } catch (error: any) {
      console.error("OpenF1 API Error:", error.message);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  // Mock 2026 Calendar
  app.get("/api/calendar/2026", (req, res) => {
    res.json([
      { round: 1, name: "Australian Grand Prix", circuit: "Albert Park Circuit", date: "2026-03-08T06:00:00Z", length: 5.278, drsZones: 4, record: "1:19.813" },
      { round: 2, name: "Chinese Grand Prix", circuit: "Shanghai International Circuit", date: "2026-03-15T09:00:00Z", length: 5.451, drsZones: 2, record: "1:32.238" },
      { round: 3, name: "Japanese Grand Prix", circuit: "Suzuka International Racing Course", date: "2026-03-29T07:00:00Z", length: 5.807, drsZones: 1, record: "1:30.983" },
      { round: 4, name: "Bahrain Grand Prix", circuit: "Bahrain International Circuit", date: "2026-04-12T17:00:00Z", length: 5.412, drsZones: 3, record: "1:31.447" },
      { round: 5, name: "Saudi Arabian Grand Prix", circuit: "Jeddah Corniche Circuit", date: "2026-04-19T19:00:00Z", length: 6.174, drsZones: 3, record: "1:30.734" },
      { round: 6, name: "Miami Grand Prix", circuit: "Miami International Autodrome", date: "2026-05-03T22:00:00Z", length: 5.412, drsZones: 3, record: "1:29.708" },
      { round: 7, name: "Canadian Grand Prix", circuit: "Circuit Gilles Villeneuve", date: "2026-05-24T22:00:00Z", length: 4.361, drsZones: 3, record: "1:13.078" },
      { round: 8, name: "Monaco Grand Prix", circuit: "Circuit de Monaco", date: "2026-06-07T15:00:00Z", length: 3.337, drsZones: 1, record: "1:12.909" },
      { round: 9, name: "Barcelona Grand Prix", circuit: "Circuit de Barcelona-Catalunya", date: "2026-06-14T15:00:00Z", length: 4.657, drsZones: 2, record: "1:16.330" },
      { round: 10, name: "Austrian Grand Prix", circuit: "Red Bull Ring", date: "2026-06-28T15:00:00Z", length: 4.318, drsZones: 3, record: "1:05.619" },
      { round: 11, name: "British Grand Prix", circuit: "Silverstone Circuit", date: "2026-07-05T16:00:00Z", length: 5.891, drsZones: 2, record: "1:27.097" },
      { round: 12, name: "Belgian Grand Prix", circuit: "Circuit de Spa-Francorchamps", date: "2026-07-19T15:00:00Z", length: 7.004, drsZones: 2, record: "1:46.286" },
      { round: 13, name: "Hungarian Grand Prix", circuit: "Hungaroring", date: "2026-07-26T15:00:00Z", length: 4.381, drsZones: 2, record: "1:16.627" },
      { round: 14, name: "Dutch Grand Prix", circuit: "Circuit Zandvoort", date: "2026-08-23T15:00:00Z", length: 4.259, drsZones: 2, record: "1:11.097" },
      { round: 15, name: "Italian Grand Prix", circuit: "Autodromo Nazionale Monza", date: "2026-09-06T15:00:00Z", length: 5.793, drsZones: 2, record: "1:21.046" },
      { round: 16, name: "Spanish Grand Prix", circuit: "IFEMA Madrid", date: "2026-09-13T15:00:00Z", length: 5.474, drsZones: 2, record: "N/A (New Circuit)" },
      { round: 17, name: "Azerbaijan Grand Prix", circuit: "Baku City Circuit", date: "2026-09-26T13:00:00Z", length: 6.003, drsZones: 2, record: "1:43.009" },
      { round: 18, name: "Singapore Grand Prix", circuit: "Marina Bay Street Circuit", date: "2026-10-11T14:00:00Z", length: 4.940, drsZones: 4, record: "1:35.867" },
      { round: 19, name: "United States Grand Prix", circuit: "Circuit of the Americas", date: "2026-10-25T22:00:00Z", length: 5.513, drsZones: 2, record: "1:36.169" },
      { round: 20, name: "Mexico City Grand Prix", circuit: "Autódromo Hermanos Rodríguez", date: "2026-11-01T22:00:00Z", length: 4.304, drsZones: 3, record: "1:17.774" },
      { round: 21, name: "São Paulo Grand Prix", circuit: "Autódromo José Carlos Pace", date: "2026-11-08T19:00:00Z", length: 4.309, drsZones: 2, record: "1:10.540" },
      { round: 22, name: "Las Vegas Grand Prix", circuit: "Las Vegas Strip Circuit", date: "2026-11-22T06:00:00Z", length: 6.201, drsZones: 2, record: "1:35.490" },
      { round: 23, name: "Qatar Grand Prix", circuit: "Lusail International Circuit", date: "2026-11-29T18:00:00Z", length: 5.419, drsZones: 1, record: "1:24.319" },
      { round: 24, name: "Abu Dhabi Grand Prix", circuit: "Yas Marina Circuit", date: "2026-12-06T15:00:00Z", length: 5.281, drsZones: 2, record: "1:26.103" }
    ]);
  });

  // Mock Regulatory Insights
  app.get("/api/regulations", (req, res) => {
    res.json([
      { id: 1, title: "2026 Technical Regulations", category: "Technical", summary: "New power unit regulations focusing on 100% sustainable fuels and increased electrical power (up to 350kW). Active aerodynamics introduced." },
      { id: 2, title: "2026 Sporting Regulations", category: "Sporting", summary: "Adjustments to weekend formats, potential changes to sprint races, and updated tyre allocation rules." },
      { id: 3, title: "Track Limits Policy", category: "Sporting", summary: "Strict enforcement of track limits at the white line. Three strikes result in a black and white flag, fourth strike is a 5-second penalty." },
      { id: 4, title: "Safety Car Procedures", category: "Sporting", summary: "Lapped cars may unlap themselves once the track is declared safe. The safety car will return to the pits at the end of the following lap." }
    ]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
