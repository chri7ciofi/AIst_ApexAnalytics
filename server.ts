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
      { round: 1, name: "Australian Grand Prix", circuit: "Albert Park Circuit", date: "2026-03-08T06:00:00Z", length: 5.278, drsZones: 4, record: "1:19.813", history: "First held in Adelaide in 1985, the Australian GP moved to Melbourne's Albert Park in 1996. It has traditionally been the season opener and is known for its unpredictable weather and exciting races." },
      { round: 2, name: "Chinese Grand Prix", circuit: "Shanghai International Circuit", date: "2026-03-15T09:00:00Z", length: 5.451, drsZones: 2, record: "1:32.238", history: "Debuting in 2004, the Shanghai circuit features a unique layout shaped like the Chinese character 'shang' (上). It's famous for its demanding first corner complex and long back straight." },
      { round: 3, name: "Japanese Grand Prix", circuit: "Suzuka International Racing Course", date: "2026-03-29T07:00:00Z", length: 5.807, drsZones: 1, record: "1:30.983", history: "A driver favorite, Suzuka is a classic figure-eight track designed by John Hugenholtz. It has hosted many championship-deciding races since its first F1 event in 1987." },
      { round: 4, name: "Bahrain Grand Prix", circuit: "Bahrain International Circuit", date: "2026-04-12T17:00:00Z", length: 5.412, drsZones: 3, record: "1:31.447", history: "The first F1 race in the Middle East, held in 2004. It transitioned to a spectacular night race under floodlights in 2014, often providing great overtaking opportunities." },
      { round: 5, name: "Saudi Arabian Grand Prix", circuit: "Jeddah Corniche Circuit", date: "2026-04-19T19:00:00Z", length: 6.174, drsZones: 3, record: "1:30.734", history: "Introduced in 2021, Jeddah is the fastest street circuit on the calendar. Its flowing, high-speed layout between walls demands extreme precision from drivers." },
      { round: 6, name: "Miami Grand Prix", circuit: "Miami International Autodrome", date: "2026-05-03T22:00:00Z", length: 5.412, drsZones: 3, record: "1:29.708", history: "Making its debut in 2022, the circuit winds around the Hard Rock Stadium. It brings a festival atmosphere and features a mix of high-speed sweeps and a tight, technical section." },
      { round: 7, name: "Canadian Grand Prix", circuit: "Circuit Gilles Villeneuve", date: "2026-05-24T22:00:00Z", length: 4.361, drsZones: 3, record: "1:13.078", history: "Located on a man-made island in Montreal, this track has hosted F1 since 1978. It's famous for the 'Wall of Champions' and often produces chaotic, action-packed races." },
      { round: 8, name: "Monaco Grand Prix", circuit: "Circuit de Monaco", date: "2026-06-07T15:00:00Z", length: 3.337, drsZones: 1, record: "1:12.909", history: "The crown jewel of F1, held since 1950. The incredibly narrow, twisty streets of Monte Carlo make overtaking nearly impossible, placing a massive premium on qualifying performance." },
      { round: 9, name: "Barcelona Grand Prix", circuit: "Circuit de Barcelona-Catalunya", date: "2026-06-14T15:00:00Z", length: 4.657, drsZones: 2, record: "1:16.330", history: "A staple since 1991, this track is well-known to teams from years of winter testing. Its mix of high and low-speed corners makes it a true test of a car's aerodynamic efficiency." },
      { round: 10, name: "Austrian Grand Prix", circuit: "Red Bull Ring", date: "2026-06-28T15:00:00Z", length: 4.318, drsZones: 3, record: "1:05.619", history: "Set in the Styrian mountains, the short, fast lap features dramatic elevation changes. Revived in 2014, it often delivers close racing and dramatic moments." },
      { round: 11, name: "British Grand Prix", circuit: "Silverstone Circuit", date: "2026-07-05T16:00:00Z", length: 5.891, drsZones: 2, record: "1:27.097", history: "The birthplace of the F1 World Championship in 1950. Silverstone is renowned for its iconic, ultra-fast corners like Maggotts, Becketts, and Chapel, and its passionate fans." },
      { round: 12, name: "Belgian Grand Prix", circuit: "Circuit de Spa-Francorchamps", date: "2026-07-19T15:00:00Z", length: 7.004, drsZones: 2, record: "1:46.286", history: "The longest track on the calendar and a true classic. Spa is famous for its unpredictable Ardennes weather and legendary corners like Eau Rouge and Raidillon." },
      { round: 13, name: "Hungarian Grand Prix", circuit: "Hungaroring", date: "2026-07-26T15:00:00Z", length: 4.381, drsZones: 2, record: "1:16.627", history: "Often described as 'Monaco without the walls', this tight, twisty circuit near Budapest has hosted F1 since 1986. It demands high downforce and precision." },
      { round: 14, name: "Dutch Grand Prix", circuit: "Circuit Zandvoort", date: "2026-08-23T15:00:00Z", length: 4.259, drsZones: 2, record: "1:11.097", history: "Set among sand dunes, Zandvoort returned to the calendar in 2021. It features old-school, unforgiving gravel traps and unique banked corners like Tarzan and Arie Luyendyk." },
      { round: 15, name: "Italian Grand Prix", circuit: "Autodromo Nazionale Monza", date: "2026-09-06T15:00:00Z", length: 5.793, drsZones: 2, record: "1:21.046", history: "The 'Temple of Speed'. Monza is the fastest track in F1, characterized by long straights and heavy braking zones. It has hosted more races than any other circuit." },
      { round: 16, name: "Spanish Grand Prix", circuit: "IFEMA Madrid", date: "2026-09-13T15:00:00Z", length: 5.474, drsZones: 2, record: "N/A (New Circuit)", history: "A brand new addition for 2026, bringing F1 back to the Spanish capital. The semi-street circuit around the IFEMA exhibition center promises a modern, sustainable event." },
      { round: 17, name: "Azerbaijan Grand Prix", circuit: "Baku City Circuit", date: "2026-09-26T13:00:00Z", length: 6.003, drsZones: 2, record: "1:43.009", history: "A unique street circuit combining an ultra-long straight with a notoriously tight section through Baku's Old City. It has a reputation for chaotic, unpredictable races." },
      { round: 18, name: "Singapore Grand Prix", circuit: "Marina Bay Street Circuit", date: "2026-10-11T14:00:00Z", length: 4.940, drsZones: 4, record: "1:35.867", history: "F1's original night race, debuting in 2008. The bumpy, twisty layout combined with extreme heat and humidity makes it one of the most physically demanding races of the year." },
      { round: 19, name: "United States Grand Prix", circuit: "Circuit of the Americas", date: "2026-10-25T22:00:00Z", length: 5.513, drsZones: 2, record: "1:36.169", history: "Opened in 2012, COTA features a dramatic uphill run to Turn 1 and a flowing first sector inspired by Silverstone and Suzuka. It has revitalized F1's popularity in the US." },
      { round: 20, name: "Mexico City Grand Prix", circuit: "Autódromo Hermanos Rodríguez", date: "2026-11-01T22:00:00Z", length: 4.304, drsZones: 3, record: "1:17.774", history: "Situated at over 2,200 meters above sea level, the thin air dramatically affects aerodynamics and engine cooling. The stadium section provides an incredible atmosphere." },
      { round: 21, name: "São Paulo Grand Prix", circuit: "Autódromo José Carlos Pace", date: "2026-11-08T19:00:00Z", length: 4.309, drsZones: 2, record: "1:10.540", history: "Interlagos is a classic, undulating track that often produces thrilling races, especially in wet conditions. It has been the scene of many dramatic championship finales." },
      { round: 22, name: "Las Vegas Grand Prix", circuit: "Las Vegas Strip Circuit", date: "2026-11-22T06:00:00Z", length: 6.201, drsZones: 2, record: "1:35.490", history: "Returning in 2023, this spectacular night race sees cars blasting down the iconic Las Vegas Strip at over 340 km/h, surrounded by neon lights and massive casinos." },
      { round: 23, name: "Qatar Grand Prix", circuit: "Lusail International Circuit", date: "2026-11-29T18:00:00Z", length: 5.419, drsZones: 1, record: "1:24.319", history: "Originally built for MotoGP, Lusail hosted its first F1 race in 2021. It's a fast, flowing track with medium and high-speed corners, held under floodlights." },
      { round: 24, name: "Abu Dhabi Grand Prix", circuit: "Yas Marina Circuit", date: "2026-12-06T15:00:00Z", length: 5.281, drsZones: 2, record: "1:26.103", history: "The traditional season finale since 2014. This twilight race starts in daylight and ends under floodlights, featuring a unique pit lane exit that passes under the track." }
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
