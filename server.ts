import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { races2026 } from './src/data/calendar2026';
import RSSParser from 'rss-parser';

dotenv.config();

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

  // 2026 Calendar — hardcoded from official schedule
  app.get("/api/calendar/2026", (_req, res) => {
    res.json(races2026);
  });

  // --- RSS News Aggregator ---
  const rssParser = new RSSParser();
  let newsCache: { data: any[]; timestamp: number } = { data: [], timestamp: 0 };
  const NEWS_CACHE_TTL = 43200000; // 12 hours

  const RSS_FEEDS = [
    { url: "https://it.motorsport.com/rss/f1/news/", source: "Motorsport" },
    { url: "https://www.formulapassion.it/feed", source: "FormulaPassion" },
    { url: "https://www.formula1.com/en/latest/all.xml", source: "F1 Official" },
  ];

  const normalizeTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const isSimilar = (a: string, b: string) => {
    const na = normalizeTitle(a), nb = normalizeTitle(b);
    if (na === nb) return true;
    const wa = na.split(' '), wb = nb.split(' ');
    const common = wa.filter(w => wb.includes(w)).length;
    return common / Math.max(wa.length, wb.length) > 0.7;
  };

  app.get("/api/news", async (_req, res) => {
    try {
      if (Date.now() - newsCache.timestamp < NEWS_CACHE_TTL && newsCache.data.length > 0) {
        return res.json(newsCache.data);
      }

      const allItems: any[] = [];
      for (const feed of RSS_FEEDS) {
        try {
          const parsed = await rssParser.parseURL(feed.url);
          // Only process first 10 per feed to be fast
          for (const item of (parsed.items || []).slice(0, 10)) {
            allItems.push({
              title: item.title || '',
              link: item.link || '',
              date: item.isoDate || item.pubDate || '',
              source: feed.source,
            });
          }
        } catch (e: any) {
          console.warn(`RSS fetch failed for ${feed.source}:`, e.message);
        }
      }

      allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const deduped: any[] = [];
      for (const item of allItems) {
        if (!deduped.some(d => isSimilar(d.title, item.title))) {
          deduped.push(item);
        }
        if (deduped.length >= 5) break; // We only need the top 5
      }

      newsCache = { data: deduped, timestamp: Date.now() };
      res.json(newsCache.data);
    } catch (error: any) {
      console.error("News RSS Error:", error.message);
      res.status(500).json({ error: "Failed to fetch news" });
    }
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

  // AI Strategy Predictor Endpoint (Chatbot Deterministico)
  app.post("/api/ai/strategy", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured in the environment." });
      }

      const { promptData, history = [], message } = req.body;
      if (!message && !promptData) {
        return res.status(400).json({ error: "Missing message or promptData in request." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let contents = [];
      const systemContext = "You are an expert F1 Race Strategist. Answer questions accurately based on the telemetry and degradation data provided. Keep responses concise, analytical, and professional. Format with short paragraphs or bullet points.";
      
      // If it's the first message, we inject the context
      if (promptData) {
        contents.push({
          role: 'user',
          parts: [{ text: `${systemContext}\n\nHere is the current race data:\n${promptData}\n\nUser Question: ${message || 'What is your recommended strategy?'}` }]
        });
      } else {
        // Build history
        contents = history.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));
        // Add new user message
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          temperature: 0.0 // Deterministico
        }
      });

      res.json({ suggestion: response.text });
    } catch (error: any) {
      console.error("AI Strategy Error:", error);
      res.status(500).json({ error: "Failed to generate AI response. Please try again later." });
    }
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
