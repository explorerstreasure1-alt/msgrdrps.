import { load } from "cheerio";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
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

async function scrapeProduct(productUrl) {
  const response = await fetch(productUrl, { headers: BROWSER_HEADERS });
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

    let response;
    try {
      response = await fetch(targetUrl, { headers: BROWSER_HEADERS });
    } catch {
      return res.status(502).json({ success: false, error: "Gardrops'a erişilemedi." });
    }
    if (!response.ok) {
      return res.status(502).json({ success: false, error: `Mağazaya erişilemedi (${response.status})` });
    }

    const html = await response.text();
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
      return res.status(404).json({ success: false, error: "Mağazada ürün bulunamadı." });
    }

    const products = [];
    for (let i = 0; i < productCards.length; i += 3) {
      const chunk = productCards.slice(i, i + 3);
      const results = await Promise.allSettled(chunk.map(scrapeProduct));
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.name) {
          products.push(r.value);
        }
      }
    }

    return res.status(200).json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
