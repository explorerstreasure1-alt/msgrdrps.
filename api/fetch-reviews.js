import { load } from "cheerio";

const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

async function fetchViaScrapeDo(url) {
  if (!SCRAPEDO_TOKEN) return null;
  const proxyUrl = `https://api.scrape.do?token=${SCRAPEDO_TOKEN}&url=${encodeURIComponent(url)}`;
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

const REVIEWERS = ["zeynep_m", "elifk", "merve_st", "ayca_d", "irem__", "ece_style", "bilge_h", "asli_c"];
const REVIEW_TEXTS = [
  "Gardrops'tan aldım, tam beklediğim gibi çıktı. Kesinlikle tavsiye ederim!",
  "İkinci el olmasına rağmen sıfır ayarında. Çok memnun kaldım.",
  "Hızlı kargo, güzel paketleme. Teşekkürler!",
  "Ürün görseldekiyle birebir aynı. Güvenilir satıcı.",
  "İlk Gardrops alışverişimdi, çok pozitif deneyim. Tekrar alacağım.",
  "Kumaş kalitesi harika, fotoğraftaki gibi. Herkese öneririm.",
  "Uygun fiyata kaliteli ürün. Gardrops mağazası güvenilir.",
  "Tam zamanında geldi, beden uyumu mükemmel. Teşekkürler.",
];

function generateReviews(products) {
  return products.filter((p) => p.name && p.images && p.images.length).map((p, i) => ({
    id: "gr" + i,
    author: REVIEWERS[i % REVIEWERS.length],
    rating: 5,
    text: REVIEW_TEXTS[i % REVIEW_TEXTS.length],
    date: ["1 hafta önce", "2 hafta önce", "3 hafta önce", "1 ay önce", "1 ay önce", "2 ay önce"][i % 6],
    image: p.images[0],
  }));
}

function findProducts($) {
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
  return products;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Sadece POST" });

  try {
    const { url } = req.body;
    if (!url || !url.includes("gardrops.com/")) {
      return res.status(400).json({ success: false, error: "Geçerli bir Gardrops URL'si girin." });
    }

    const username = url.match(/gardrops\.com\/(?:magaza\/)?([^/?#]+)/)?.[1];

    /* -------- ADIM 1: Gardrops internal API -------- */
    if (username) {
      const storeApis = [
        `https://api.gardrops.com/v2/users/${username}/products`,
        `https://api.gardrops.com/v1/users/${username}/products`,
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
            const mapped = list.map((p) => {
              const d = p.data || p;
              const images = [];
              if (d.images?.length) d.images.forEach((i) => { if (typeof i === "string") images.push(i); });
              if (d.image) images.push(d.image);
              return { name: d.name || d.title || "", images: images.filter(Boolean), gardropsUrl: "" };
            });
            const reviews = generateReviews(mapped);
            return res.status(200).json({ success: true, data: reviews });
          }
        } catch {}
      }
    }

    /* -------- ADIM 2: scrape.do proxy (Cloudflare bypass) -------- */
    let html = await fetchViaScrapeDo(url);
    if (!html) {
      /* -------- ADIM 3: Direct HTML scrape (fallback) -------- */
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const response = await fetch(url, { headers: HTML_HEADERS, signal: ctrl.signal });
      clearTimeout(timer);
      if (!response.ok) {
        return res.status(502).json({ success: false, error: `Gardrops'a erişilemedi (${response.status})` });
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
    const products = findProducts($);

    if (!products.length) {
      return res.status(404).json({ success: false, error: "Ürün bulunamadı." });
    }

    const reviews = generateReviews(products);
    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
