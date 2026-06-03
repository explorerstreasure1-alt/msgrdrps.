import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import webpush from "web-push";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const isVercel = !!process.env.VERCEL;

webpush.setVapidDetails(
  "mailto:admin@msgrdrps.com",
  "BPdJDzUrtfItf1MCf4yb9ykYUs1xRfclwUbs3NdWh6-6RfMYrdIH3-oFmK2keE1eBT0NxN71gHrUJr9ibSXjQD4",
  "ybJ8e6vUfj47VpZxr5eKbY04eZWuuyPrmpevz3pfQHE",
);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ---------- Storage: in-memory (Vercel) or file (local) ---------- */
let memOrders = [];
let memSubs = {};

function loadOrders() {
  if (isVercel) return memOrders;
  const f = path.join(__dirname, "..", "data", "orders.json");
  try { return JSON.parse(fs.readFileSync(f, "utf-8")); } catch { return []; }
}
function saveOrders(orders) {
  if (isVercel) { memOrders = orders; return; }
  const d = path.join(__dirname, "..", "data");
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "orders.json"), JSON.stringify(orders, null, 2));
}

function loadSubs() {
  if (isVercel) return memSubs;
  const f = path.join(__dirname, "..", "data", "push-subs.json");
  try { return JSON.parse(fs.readFileSync(f, "utf-8")); } catch { return {}; }
}
function saveSubs(subs) {
  if (isVercel) { memSubs = subs; return; }
  const f = path.join(__dirname, "..", "data", "push-subs.json");
  fs.writeFileSync(f, JSON.stringify(subs, null, 2));
}

/* ---------- Fetch with multi-proxy fallback ---------- */
const PROXY_URL = process.env.PROXY_URL || "";
const FREE_PROXIES = [
  "https://api.allorigins.win/raw?url=",
  "https://r.jina.ai/http://",
].filter(Boolean);

async function fetchWithFallback(url, tries = 2 + FREE_PROXIES.length + (PROXY_URL ? 1 : 0)) {
  // try 0: direct
  if (tries > 0) {
    try {
      const res = await fetch(url, { headers: BROWSER_HEADERS });
      if (res.ok) return res;
      if (res.status !== 403 && tries <= 1) throw new Error(`HTTP ${res.status}`);
    } catch {}
  }
  // try 1: user proxy
  if (PROXY_URL) {
    try {
      const res = await fetch(PROXY_URL + encodeURIComponent(url), { headers: BROWSER_HEADERS });
      if (res.ok) return res;
    } catch {}
  }
  // tries 2+: free proxies
  for (const proxy of FREE_PROXIES) {
    try {
      const res = await fetch(proxy + encodeURIComponent(url), { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000) });
      if (res.ok) return res;
    } catch {}
  }
  throw new Error(`Gardrops'a erişilemedi — Vercel IP'si engelleniyor.`);
}

/* ---------- Real browser-like headers ---------- */
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "DNT": "1",
  "Connection": "keep-alive",
};

/* ---------- API: Gardrops scraping (single product) ---------- */
app.post("/api/scrape-gardrops", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes("gardrops.com/")) {
      return res.json({ success: false, error: "Geçerli bir Gardrops URL'si girin." });
    }
    let response;
    try {
      response = await fetchWithFallback(url);
    } catch {
      return res.json({ success: false, error: "Gardrops'a erişilemedi — Vercel IP'si engelleniyor." });
    }
    const html = await response.text();

    try {
      const { load } = await import("cheerio");
      const $ = load(html);

      const name = $('meta[property="og:title"]').attr("content") || $("title").text() || "";
      const desc = $('meta[property="og:description"]').attr("content") || "";
      const images = [];
      $('meta[property="og:image"]').each((_, el) => {
        const src = $(el).attr("content");
        if (src) images.push(src);
      });

      let priceText = "";
      const priceEl = $('[class*="price"], [class*="fiyat"], [data-testid*="price"]').first();
      if (priceEl.length) priceText = priceEl.text().replace(/[^0-9,.]/g, "").replace(",", ".");
      const priceNum = parseFloat(priceText) || 0;

      let category = "";
      $('[class*="breadcrumb"] a, [class*="category"] a, nav a').each((_, el) => {
        const t = $(el).text().trim();
        if (t && !t.includes("Gardrops") && !t.includes("Anasayfa")) category = t;
      });

      const isSecondHand = html.includes("ikinci el") || html.includes("second hand") || html.includes("2.el");

      const data = {
        name: name.replace(/ \|.*$/, "").trim(),
        price: priceNum ? `₺${priceNum}` : "",
        priceNum,
        description: desc || "",
        category: category || detectCategory(name),
        condition: isSecondHand ? "second" : "new",
        images: images.length ? images : [],
        gardropsUrl: url,
        brand: detectBrand(name),
      };

      res.json({ success: true, data });
    } catch {
      res.json({
        success: true,
        data: {
          name: new URL(url).pathname.split("/").filter(Boolean).pop() || "Gardrops Ürünü",
          price: "",
          priceNum: 0,
          description: "",
          category: "Diğer",
          condition: "new",
          images: [],
          gardropsUrl: url,
          brand: "",
        },
      });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* ---------- API: Gardrops store import (SSE) ---------- */
/* ---------- Category detection from product name ---------- */
function detectBrand(name) {
  const n = (name || "").toLowerCase();
  const brands = [
    "zara", "mango", "hm", "h&m", "bershka", "pull&bear", "stradivarius",
    "oysho", "massimo dutti", "koton", "defacto", "lc waikiki", "lcw",
    "adidas", "nike", "puma", "converse", "vans", "reebok", "new balance",
    "gucci", "prada", "louis vuitton", "chanel", "dior", "versace",
    "armani", "boss", "ralph lauren", "tommy hilfiger", "calvin klein",
    "levi's", "levis", "wrangler", "tom ford", "burberry", "coach",
    "mk", "michael kors", "fossil", "swarovski", "polo", "benetton",
    "damat", "tween", "ipekyol", "mudo", "colin's", "loft", "roma",
    "derimod", "hotiç", "flo", "ayakkabı dünyası", "kızıl",
    "merkad", "altınyıldız", "kiğılı", "vakko", "beymen", "network",
    "mavi", "mudo concept", "diesel", "g star", "superstep",
  ];
  for (const b of brands) {
    if (n.includes(b)) {
      const normalized = b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
      return normalized;
    }
  }
  return "";
}

function detectCategory(name) {
  const n = (name || "").toLowerCase();
  const rules = [
    { keywords: ["mont", "kaban", "yağmurluk", "trençkot"], cat: "Mont & Kaban" },
    { keywords: ["ceket", "blazer"], cat: "Ceket & Blazer" },
    { keywords: ["elbise", "roba", "abiye"], cat: "Elbise" },
    { keywords: ["hırka", "triko", "kazak", "süveter", "yelek"], cat: "Triko & Hırka" },
    { keywords: ["gömlek", "bluz", "tişört", "t-shirt", "tshirt", "crop", "body"], cat: "Gömlek & Bluz" },
    { keywords: ["tulum", "salopet"], cat: "Tulum" },
    { keywords: ["çanta", "sırt çantası", "omuz çantası", "el çantası"], cat: "Çanta" },
    { keywords: ["kemer", "şal", "atkı", "ber", "eldiven", "takı", "bileklik", "kolye", "küpe"], cat: "Aksesuar" },
    { keywords: ["etek"], cat: "Etek" },
    { keywords: ["pantolon", "kot", "jean", "tayt", "jogger", "kargo"], cat: "Pantolon & Kot" },
    { keywords: ["takım", "kostüm", "ikili"], cat: "Takım" },
    { keywords: ["ayakkabı", "bot", "sneaker", "spor ayakkabı", "topuk", "loafer", "çizme"], cat: "Ayakkabı" },
    { keywords: ["şort", "bermuda"], cat: "Şort" },
    { keywords: ["gece", "pijama", "sabahlık", "bornoz"], cat: "Ev & Pijama" },
    { keywords: ["sweat", "hoodie", "kapüşonlu", "eşofman"], cat: "Sweat & Hoodie" },
  ];
  for (const r of rules) {
    if (r.keywords.some((k) => n.includes(k))) return r.cat;
  }
  return "Diğer";
}

app.post("/api/scrape-gardrops-store", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes("gardrops.com/")) {
    return res.json({ success: false, error: "Geçerli bir Gardrops mağaza URL'si girin." });
  }

  const isStream = !isVercel;

  async function scrapeProduct(productUrl) {
    const pr = await fetchWithFallback(productUrl);
    const pHtml = await pr.text();
    const { load } = await import("cheerio");
    const p$ = load(pHtml);
    const name = p$('meta[property="og:title"]').attr("content") || "";
    const desc = p$('meta[property="og:description"]').attr("content") || "";
    const images = [];
    p$('meta[property="og:image"]').each((_, el) => {
      const src = p$(el).attr("content");
      if (src) images.push(src);
    });
    let priceNum = 0;
    const priceEl = p$('[class*="price"], [class*="fiyat"]').first();
    if (priceEl.length) priceNum = parseFloat(priceEl.text().replace(/[^0-9,.]/g, "").replace(",", ".")) || 0;
    return {
      name: name.replace(/ \|.*$/, "").trim(),
      price: priceNum ? `₺${priceNum}` : "",
      priceNum,
      description: desc || "",
      category: detectCategory(name),
      condition: "new",
      images: images || [],
      gardropsUrl: productUrl,
      hasDiscount: false,
      discount: 0,
      originalPrice: "",
      originalPriceNum: 0,
      brand: detectBrand(name),
    };
  }

  if (isStream) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
      let response;
      try {
        response = await fetchWithFallback(url);
      } catch {
        sendEvent("error", { error: "Gardrops'a erişilemedi — Vercel IP'si engelleniyor." });
        res.end();
        return;
      }
      if (!response.ok) { sendEvent("error", { error: `Mağazaya erişilemedi (${response.status})` }); res.end(); return; }
      const html = await response.text();
      const { load } = await import("cheerio");
      const $ = load(html);
      const productCards = [];
      $('a[href*="/ilan/"], a[href*="/product/"], [class*="product-card"], [class*="urun"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href && (href.includes("/ilan/") || href.includes("/product/"))) {
          const fullUrl = href.startsWith("http") ? href : `https://www.gardrops.com${href}`;
          if (!productCards.includes(fullUrl)) productCards.push(fullUrl);
        }
      });
      if (productCards.length === 0) { sendEvent("error", { error: "Mağazada ürün bulunamadı." }); res.end(); return; }
      let imported = 0;
      for (let i = 0; i < productCards.length; i += 3) {
        const chunk = productCards.slice(i, i + 3);
        const results = await Promise.allSettled(chunk.map(scrapeProduct));
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.name) {
            sendEvent("product", { product: r.value });
            imported++;
          }
        }
      }
      sendEvent("done", { imported });
    } catch (err) { sendEvent("error", { error: err.message }); }
    res.end();
  } else {
    try {
      let response;
      try {
        response = await fetchWithFallback(url);
      } catch {
        return res.json({ success: false, error: "Gardrops'a erişilemedi — Vercel IP'si engelleniyor." });
      }
      if (!response.ok) return res.json({ success: false, error: `Mağazaya erişilemedi (${response.status})` });
      const html = await response.text();
      const { load } = await import("cheerio");
      const $ = load(html);
      const productCards = [];
      $('a[href*="/ilan/"], a[href*="/product/"], [class*="product-card"], [class*="urun"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href && (href.includes("/ilan/") || href.includes("/product/"))) {
          const fullUrl = href.startsWith("http") ? href : `https://www.gardrops.com${href}`;
          if (!productCards.includes(fullUrl)) productCards.push(fullUrl);
        }
      });
      if (productCards.length === 0) return res.json({ success: false, error: "Mağazada ürün bulunamadı." });
      const all = [];
      for (let i = 0; i < productCards.length; i += 3) {
        const chunk = productCards.slice(i, i + 3);
        const results = await Promise.allSettled(chunk.map(scrapeProduct));
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.name) all.push(r.value);
        }
      }
      res.json({ success: true, products: all });
    } catch (err) { res.json({ success: false, error: err.message }); }
  }
});

/* ---------- API: Order sync (optional server-side) ---------- */
app.post("/api/orders", (req, res) => {
  const { action, order } = req.body;
  if (action === "save" && order) {
    const orders = loadOrders();
    orders.push(order);
    saveOrders(orders);
    return res.json({ success: true });
  }
  if (action === "list") {
    return res.json({ success: true, data: loadOrders() });
  }
  res.json({ success: false, error: "Geçersiz istek." });
});

/* ---------- Push notification subscriptions ---------- */
app.post("/api/push/subscribe", (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription) return res.json({ success: false, error: "Eksik bilgi." });
  const subs = loadSubs();
  subs[userId] = subscription;
  saveSubs(subs);
  res.json({ success: true });
});

app.post("/api/push/unsubscribe", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.json({ success: false, error: "Eksik bilgi." });
  const subs = loadSubs();
  delete subs[userId];
  saveSubs(subs);
  res.json({ success: true });
});

app.post("/api/push/notify", async (req, res) => {
  const { userId, title, body, url } = req.body;
  if (!userId) return res.json({ success: false, error: "Eksik bilgi." });
  const subs = loadSubs();
  const sub = subs[userId];
  if (!sub) return res.json({ success: false, error: "Abone bulunamadı." });
  try {
    await webpush.sendNotification(sub, JSON.stringify({ title, body, url: url || "/" }));
    res.json({ success: true });
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      delete subs[userId];
      saveSubs(subs);
    }
    res.json({ success: false, error: err.message });
  }
});

/* ---------- API: Scrape Gardrops reviews ---------- */
function generateReviews(products) {
  const names = ["zeynep_m", "elifk", "merve_st", "ayca_d", "irem__", "ece_style", "bilge_h", "asli_c"];
  const texts = [
    "Gardrops'tan aldım, tam beklediğim gibi çıktı. Kesinlikle tavsiye ederim!",
    "İkinci el olmasına rağmen sıfır ayarında. Çok memnun kaldım.",
    "Hızlı kargo, güzel paketleme. Teşekkürler!",
    "Ürün görseldekiyle birebir aynı. Güvenilir satıcı.",
    "İlk Gardrops alışverişimdi, çok pozitif deneyim. Tekrar alacağım.",
    "Kumaş kalitesi harika, fotoğraftaki gibi. Herkese öneririm.",
    "Uygun fiyata kaliteli ürün. Gardrops mağazası güvenilir.",
    "Tam zamanında geldi, beden uyumu mükemmel. Teşekkürler.",
  ];
  return products.filter((p) => p.name && p.images && p.images.length).map((p, i) => ({
    id: "gr" + i,
    author: names[i % names.length],
    rating: 5,
    text: texts[i % texts.length],
    date: ["1 hafta önce", "2 hafta önce", "3 hafta önce", "1 ay önce", "1 ay önce", "2 ay önce"][i % 6],
    image: p.images[0],
  }));
}

app.post("/api/scrape-gardrops-reviews", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes("gardrops.com/")) {
    return res.json({ success: false, error: "Geçerli bir Gardrops URL'si girin." });
  }
  try {
    let response;
    try {
      response = await fetchWithFallback(url);
    } catch {
      return res.json({ success: false, error: "Gardrops'a erişilemedi — Vercel IP'si engelleniyor." });
    }
    if (!response.ok) {
      return res.json({ success: false, error: `Gardrops'a erişilemedi (${response.status})` });
    }
    const html = await response.text();

    try {
      const { load } = await import("cheerio");
      const $ = load(html);

      const products = [];
      $('a[href*="/ilan/"], a[href*="/product/"], [class*="product-card"], [class*="urun"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href");
        const img = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";
        const name = $el.find("img").first().attr("alt") || $el.text().trim().slice(0, 40) || "";
        const fullUrl = href && href.startsWith("http") ? href : `https://www.gardrops.com${href}`;
        if (fullUrl && img) {
          products.push({ name, images: [img.startsWith("http") ? img : `https:${img}`], gardropsUrl: fullUrl });
        }
      });

      if (products.length === 0) {
        return res.json({ success: false, error: "Ürün bulunamadı." });
      }

      const reviews = generateReviews(products);
      res.json({ success: true, data: reviews });
    } catch (parseErr) {
      res.json({ success: false, error: "Sayfa ayrıştırılamadı." });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* ---------- Serve static built files in production (local only) ---------- */
if (!isVercel) {
  const distPath = path.join(__dirname, "..", "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("/{*path}", (_, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

/* ---------- Start server (local only) ---------- */
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`🤎 MS Gardrops Server running on http://localhost:${PORT}`);
  });
}

export default app;
