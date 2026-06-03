import { load } from "cheerio";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
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

    let response;
    try {
      response = await fetch(url, { headers: BROWSER_HEADERS });
    } catch {
      return res.status(502).json({ success: false, error: "Gardrops'a erişilemedi." });
    }
    if (!response.ok) {
      return res.status(502).json({ success: false, error: `Gardrops'a erişilemedi (${response.status})` });
    }

    const html = await response.text();
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
      return res.status(404).json({ success: false, error: "Ürün bulunamadı." });
    }

    const reviews = generateReviews(products);
    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
