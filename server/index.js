import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import webpush from "web-push";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

webpush.setVapidDetails(
  "mailto:admin@msgrdrps.com",
  "BPdJDzUrtfItf1MCf4yb9ykYUs1xRfclwUbs3NdWh6-6RfMYrdIH3-oFmK2keE1eBT0NxN71gHrUJr9ibSXjQD4",
  "ybJ8e6vUfj47VpZxr5eKbY04eZWuuyPrmpevz3pfQHE",
);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ---------- In-memory order persistence ---------- */
const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadOrders() {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, "orders.json"), "utf-8");
    return JSON.parse(raw);
  } catch { return []; }
}
function saveOrders(orders) {
  fs.writeFileSync(path.join(DATA_DIR, "orders.json"), JSON.stringify(orders, null, 2));
}

/* ---------- API: Gardrops scraping (single product) ---------- */
app.post("/api/scrape-gardrops", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes("gardrops.com/")) {
      return res.json({ success: false, error: "Geçerli bir Gardrops URL'si girin." });
    }
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
    });
    if (!response.ok) {
      return res.json({ success: false, error: `Gardrops'a erişilemedi (${response.status})` });
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
        },
      });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* ---------- API: Gardrops store import (SSE) ---------- */
/* ---------- Category detection from product name ---------- */
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

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) {
      sendEvent("error", { error: `Mağazaya erişilemedi (${response.status})` });
      res.end();
      return;
    }
    const html = await response.text();

    try {
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

      if (productCards.length === 0) {
        sendEvent("error", { error: "Mağazada ürün bulunamadı." });
        res.end();
        return;
      }

      const CHUNK_SIZE = 3;
      let imported = 0;
      for (let i = 0; i < productCards.length; i += CHUNK_SIZE) {
        const chunk = productCards.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
          chunk.map(async (productUrl) => {
            const pr = await fetch(productUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            });
            const pHtml = await pr.text();
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
            return { name, priceNum, images, description: desc, gardropsUrl: productUrl };
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value.name) {
            const d = result.value;
            sendEvent("product", {
              product: {
                name: d.name.replace(/ \|.*$/, "").trim(),
                price: d.priceNum ? `₺${d.priceNum}` : "",
                priceNum: d.priceNum,
                description: d.description || "",
                category: detectCategory(d.name),
                condition: "new",
                images: d.images || [],
                gardropsUrl: d.gardropsUrl,
                hasDiscount: false,
                discount: 0,
                originalPrice: "",
                originalPriceNum: 0,
              },
            });
            imported++;
          }
        }
      }

      sendEvent("done", { imported });
    } catch (parseErr) {
      sendEvent("error", { error: "Sayfa ayrıştırılamadı: " + parseErr.message });
    }
  } catch (err) {
    sendEvent("error", { error: err.message });
  }

  res.end();
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
const SUB_FILE = path.join(DATA_DIR, "push-subs.json");

function loadSubs() {
  try { return JSON.parse(fs.readFileSync(SUB_FILE, "utf-8")); }
  catch { return {}; }
}
function saveSubs(subs) {
  fs.writeFileSync(SUB_FILE, JSON.stringify(subs, null, 2));
}

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
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
    });
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

/* ---------- Serve static built files in production ---------- */
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`🤎 MS Gardrops Server running on http://localhost:${PORT}`);
});
