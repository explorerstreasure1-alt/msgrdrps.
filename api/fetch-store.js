import { load } from "cheerio";

const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;
const SCRAPEDO_BASE = "https://api.scrape.do";

async function fetchViaScrapeDo(url) {
  if (!SCRAPEDO_TOKEN) return null;
  const proxyUrl = `https://api.scrape.do?token=${SCRAPEDO_TOKEN}&url=${encodeURIComponent(url)}&render=false`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(proxyUrl, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.length < 200) return null;
    if (text.includes("cf-browser-verification") || text.includes("cloudflare") || text.includes("__cf_chl")) return null;
    return text;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

const API_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Origin": "https://www.gardrops.com",
  "Referer": "https://www.gardrops.com/",
};

const HTML_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

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
    if (n.includes(b)) return b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
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
    { keywords: ["kemer", "şal", "atkı", "ber", "eldiven", "takı", "bileklik"], cat: "Aksesuar" },
    { keywords: ["etek"], cat: "Etek" },
    { keywords: ["pantolon", "kot", "jean", "tayt", "jogger"], cat: "Pantolon & Kot" },
    { keywords: ["takım", "kostüm", "ikili"], cat: "Takım" },
    { keywords: ["ayakkabı", "bot", "sneaker", "spor ayakkabı", "topuk", "loafer"], cat: "Ayakkabı" },
    { keywords: ["şort", "bermuda"], cat: "Şort" },
    { keywords: ["sweat", "hoodie", "kapüşonlu", "eşofman"], cat: "Sweat & Hoodie" },
  ];
  for (const r of rules) {
    if (r.keywords.some((k) => n.includes(k))) return r.cat;
  }
  return "Diğer";
}

function extractUsername(url) {
  const u = new URL(url);
  const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

async function scrapeProductViaAPI(productId) {
  const apis = [
    `https://api.gardrops.com/v2/products/${productId}`,
    `https://api.gardrops.com/v1/products/${productId}`,
  ];
  for (const apiUrl of apis) {
    try {
      const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(apiUrl, { headers: API_HEADERS, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = await res.json();
      if (json) return json;
    } catch {}
  }
  return null;
}

function mapApiProduct(apiData, productUrl) {
  const d = apiData.data || apiData;
  const priceNum = parseFloat(d.price || d.priceNum || 0);
  const name = (d.name || d.title || "").replace(/ \|.*$/, "").trim();
  const images = [];
  if (d.images && Array.isArray(d.images)) {
    d.images.forEach((img) => {
      if (typeof img === "string") images.push(img);
      else if (img?.url || img?.src) images.push(img.url || img.src);
    });
  }
  if (d.image) images.push(d.image);
  if (d.image_url) images.push(d.image_url);
  if (d.photo) images.push(d.photo);
  d.photos?.forEach((p) => { if (typeof p === "string") images.push(p); else if (p?.url) images.push(p.url); });
  return {
    name,
    price: priceNum ? `₺${priceNum}` : "",
    priceNum,
    description: (d.description || d.desc || "").replace(/<[^>]*>/g, ""),
    category: d.category_name || d.category || detectCategory(name),
    condition: (d.condition || "").includes("second") ? "second" : "new",
    images: [...new Set(images.filter(Boolean))],
    gardropsUrl: productUrl,
    hasDiscount: false,
    discount: 0,
    originalPrice: "",
    originalPriceNum: 0,
    brand: d.brand || d.brand_name || detectBrand(name),
  };
}

async function scrapeProductHTML(productUrl) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  const response = await fetch(productUrl, { headers: HTML_HEADERS, signal: ctrl.signal });
  clearTimeout(timer);
  const html = await response.text();
  const $ = load(html);
  const name = $('meta[property="og:title"]').attr("content") || "";
  const desc = $('meta[property="og:description"]').attr("content") || "";
  const images = [];
  $('meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr("content");
    if (src) images.push(src);
  });
  let priceNum = 0;
  const priceEl = $('[class*="price"], [class*="fiyat"]').first();
  if (priceEl.length) {
    priceNum = parseFloat(priceEl.text().replace(/[^0-9,.]/g, "").replace(",", ".")) || 0;
  }
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

async function scrapeProductSmart(productUrl) {
  const productId = productUrl.match(/(\d+)(?:\?|$)/)?.[1];
  if (productId) {
    const apiData = await scrapeProductViaAPI(productId);
    if (apiData) return mapApiProduct(apiData, productUrl);
  }
  return scrapeProductHTML(productUrl);
}

function findProductLinks($) {
  const links = [];
  $('a[href*="/ilan/"], a[href*="/product/"], [class*="product-card"] a, [class*="urun"] a').each((_, el) => {
    const href = $(el).attr("href");
    if (href && (href.includes("/ilan/") || href.includes("/product/"))) {
      const fullUrl = href.startsWith("http") ? href : `https://www.gardrops.com${href}`;
      if (!links.includes(fullUrl)) links.push(fullUrl);
    }
  });
  if (!links.length) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr("href");
      const fullUrl = href.startsWith("http") ? href : `https://www.gardrops.com${href}`;
      if (fullUrl.match(/gardrops\.com\/.*\d{5,}/) && !links.includes(fullUrl)) links.push(fullUrl);
    });
  }
  return links;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const { targetUrl } = req.body;
    if (!targetUrl || !targetUrl.includes("gardrops.com/")) {
      return res.status(400).json({ success: false, error: "Geçerli Gardrops mağaza URL'si girin." });
    }

    const username = extractUsername(targetUrl);

    /* -------- ADIM 1: Gardrops internal API -------- */
    let apiProducts = [];

    if (username) {
      const storeApis = [
        `https://api.gardrops.com/v2/users/${username}/products`,
        `https://api.gardrops.com/v1/users/${username}/products`,
        `https://api.gardrops.com/v2/stores/${username}/products`,
      ];
      for (const apiUrl of storeApis) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 30000);
          const res = await fetch(apiUrl, { headers: API_HEADERS, signal: ctrl.signal });
          clearTimeout(timer);
          if (!res.ok) continue;
          const json = await res.json();
          const list = Array.isArray(json) ? json : (json.data || json.products || json.items || []);
          if (list.length) {
            apiProducts = list.map((p) => mapApiProduct(p, `https://www.gardrops.com/ilan/${p.id || p.slug || ""}`));
            break;
          }
        } catch {}
      }
    }

    if (apiProducts.length) {
      return res.status(200).json({ success: true, products: apiProducts });
    }

    /* -------- ADIM 2: scrape.do proxy (Cloudflare bypass) -------- */
    let html = await fetchViaScrapeDo(targetUrl);
    if (!html) {
      /* -------- ADIM 3: Direct HTML scrape (fallback) -------- */
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const response = await fetch(targetUrl, { headers: HTML_HEADERS, signal: ctrl.signal });
      clearTimeout(timer);
      if (!response.ok) {
        return res.status(502).json({ success: false, error: `Mağazaya erişilemedi (${response.status})` });
      }
      html = await response.text();
    }

    if (!html || html.length < 200) {
      return res.status(502).json({ success: false, error: "Gardrops boş sayfa döndü" });
    }
    if (html.includes("cf-browser-verification") || html.includes("cloudflare") || html.includes("__cf_chl")) {
      return res.status(502).json({ success: false, error: "Cloudflare takıldı — proxy çalışmıyor." });
    }

    const $ = load(html);
    const productCards = findProductLinks($);

    if (!productCards.length) {
      const text = $("body").text();
      if (text.includes("cloudflare") || text.includes("CF-") || text.includes("just a moment")) {
        return res.status(502).json({ success: false, error: "Cloudflare koruması — çözülüyor..." });
      }
      return res.status(404).json({ success: false, error: "Mağazada ürün bulunamadı." });
    }

    const products = [];
    for (let i = 0; i < Math.min(productCards.length, 30); i += 3) {
      const chunk = productCards.slice(i, i + 3);
      const results = await Promise.allSettled(chunk.map(scrapeProductSmart));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.name) products.push(r.value);
      }
    }

    return res.status(200).json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
