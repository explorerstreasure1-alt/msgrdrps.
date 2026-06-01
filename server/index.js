import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeGardropsProduct, scrapeGardropsStore } from "./scraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post("/api/scrape-gardrops", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Gardrops ürün linki gerekli." });
  }

  if (!url.includes("gardrops.com/")) {
    return res.status(400).json({ error: "Geçerli bir Gardrops linki girin." });
  }

  try {
    const data = await scrapeGardropsProduct(url);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Scrape error:", err);
    res.status(500).json({
      error: "Ürün bilgileri alınamadı: " + err.message,
    });
  }
});

app.post("/api/scrape-gardrops-store", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Gardrops mağaza linki gerekli." });
  }

  if (!url.includes("gardrops.com/")) {
    return res.status(400).json({ error: "Geçerli bir Gardrops linki girin." });
  }

  // SSE streaming — each product sent as it's scraped, then "done"
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`event: start\ndata: {}\n\n`);

  const writeEvent = (type, data) => {
    try { res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  let aborted = false;
  res.on("close", () => { if (!res.writableEnded) aborted = true; });
  try {
    let count = 0;
    const products = await scrapeGardropsStore(url, {
      signal: { get aborted() { return aborted; } },
      onProduct(product, index, total) {
        if (aborted) return;
        count++;
        writeEvent("product", { index, total, product });
      },
    });
    if (!aborted) writeEvent("done", { count });
    res.end();
  } catch (err) {
    console.error("Store scrape error:", err);
    if (!aborted) writeEvent("error", { error: err.message });
    res.end();
  } finally {
    aborted = true;
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Serve built frontend in production
const distPath = path.resolve(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Gardrops scraper API running on http://localhost:${PORT}`);
});
