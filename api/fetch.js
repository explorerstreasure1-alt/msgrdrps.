import { load } from "cheerio";

const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

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

export default async function handler(req, res) {
  console.log("SCRAPEDO_TOKEN durumu:", SCRAPEDO_TOKEN ? "Dolu (Mevcut)" : "Boş (Undefined)");
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const { targetUrl } = req.body;
    if (!targetUrl || !targetUrl.includes("gardrops.com/")) {
      return res.status(400).json({ success: false, error: "Geçerli Gardrops URL'si girin" });
    }
    if (!SCRAPEDO_TOKEN) {
      return res.status(500).json({ success: false, error: "SCRAPEDO_TOKEN environment variable eksik" });
    }

    const proxyUrl = `https://api.scrape.do?token=${SCRAPEDO_TOKEN}&url=${encodeURIComponent(targetUrl)}`;
    console.log("scrape.do istek gönderiliyor:", proxyUrl.replace(SCRAPEDO_TOKEN, "***"));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const response = await fetch(proxyUrl, { signal: ctrl.signal });
    clearTimeout(timer);

    console.log("scrape.do HTTP durumu:", response.status);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.log("scrape.do hata gövdesi:", body.slice(0, 500));
      return res.status(502).json({ success: false, error: `scrape.do döndü ${response.status}: ${body.slice(0, 200)}` });
    }

    const html = await response.text();
    console.log("scrape.do yanıt boyutu:", html.length, "byte");

    if (!html || html.length < 200) {
      return res.status(502).json({ success: false, error: "scrape.do boş sayfa döndü" });
    }

    if (html.includes("cf-browser-verification") || html.includes("__cf_chl") || html.includes("cloudflare")) {
      return res.status(502).json({ success: false, error: "scrape.do Cloudflare'i geçemedi" });
    }

    const $ = load(html);

    const name = $('meta[property="og:title"]').attr("content") || $("title").text() || "";
    const description = $('meta[property="og:description"]').attr("content") || "";

    const images = [];
    $('meta[property="og:image"]').each((_, el) => {
      const src = $(el).attr("content");
      if (src) images.push(src);
    });

    let priceNum = 0;
    const priceEl = $('[class*="price"], [class*="fiyat"], [data-testid*="price"]').first();
    if (priceEl.length) {
      priceNum = parseFloat(priceEl.text().replace(/[^0-9,.]/g, "").replace(",", ".")) || 0;
    }

    let category = "";
    $('[class*="breadcrumb"] a, [class*="category"] a, nav a').each((_, el) => {
      const t = $(el).text().trim();
      if (t && !t.includes("Gardrops") && !t.includes("Anasayfa")) category = t;
    });

    const isSecondHand = $("body").text().toLowerCase().includes("ikinci el") || $("body").text().toLowerCase().includes("2.el");
    const cleanName = name.replace(/ \|.*$/, "").trim();

    return res.status(200).json({
      success: true,
      data: {
        name: cleanName,
        price: priceNum ? `₺${priceNum}` : "",
        priceNum,
        description: description || "",
        category: category || detectCategory(cleanName),
        condition: isSecondHand ? "second" : "new",
        images: images.length ? images : [],
        gardropsUrl: targetUrl,
        brand: detectBrand(cleanName),
      },
    });
  } catch (error) {
    console.log("fetch.js catch:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
