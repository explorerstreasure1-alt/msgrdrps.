/* Gardrops Sync API — ücretsiz, Vercel'de çalışır
 * Katman 1: Gardrops internal API ile write (varsa)
 * Katman 2: check endpoint (ürün hâlâ yayında mı?)
 */

const SELLER_TOKEN = process.env.GARDROPS_SELLER_TOKEN || "";

const API_HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
};

function extractProductId(url) {
  const m = url.match(/(\d+)(?:\?|$)/);
  return m ? m[1] : null;
}

async function tryDeactivateViaAPI(productUrl) {
  if (!SELLER_TOKEN) return null;
  const productId = extractProductId(productUrl);
  if (!productId) return null;
  const apis = [
    { url: `https://api.gardrops.com/v2/products/${productId}/deactivate`, method: "POST" },
    { url: `https://api.gardrops.com/v2/products/${productId}`, method: "PATCH", body: { status: "sold" } },
    { url: `https://api.gardrops.com/v1/products/${productId}/deactivate`, method: "POST" },
  ];
  for (const api of apis) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(api.url, {
        method: api.method,
        headers: { ...API_HEADERS, Authorization: `Bearer ${SELLER_TOKEN}`, "Content-Type": "application/json" },
        body: api.body ? JSON.stringify(api.body) : undefined,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) return { success: true, method: "api", endpoint: api.url };
    } catch {}
  }
  return null;
}

async function checkProductStatus(productUrl) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(productUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { status: "sold", reason: `HTTP ${res.status}` };
    const text = await res.text();
    if (!text || text.length < 200) return { status: "sold", reason: "empty" };
    if (text.includes("yayında değil") || text.includes("mevcut değil") || text.includes("404") || text.includes("Sayfa bulunamadı")) {
      return { status: "sold", reason: "not_found" };
    }
    return { status: "active", reason: "ok" };
  } catch {
    clearTimeout(timer);
    return { status: "unknown", reason: "fetch_failed" };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const { action, gardropsUrl, productUrl } = req.body;
    const targetUrl = gardropsUrl || productUrl;

    if (!targetUrl || !targetUrl.includes("gardrops.com/")) {
      return res.status(400).json({ success: false, error: "Geçerli Gardrops URL'si gerekli" });
    }

    if (action === "check") {
      const result = await checkProductStatus(targetUrl);
      return res.status(200).json({ success: true, ...result });
    }

    if (action === "mark-sold") {
      /* Katman 1: API ile dene */
      const apiResult = await tryDeactivateViaAPI(targetUrl);
      if (apiResult) {
        return res.status(200).json({ success: true, method: apiResult.method, note: "Gardrops API ile satıldı işaretlendi" });
      }
      /* API çalışmadı — admin manüel yapacak */
      return res.status(200).json({
        success: true,
        method: "manual",
        note: "API ile işaretlenemedi — admin manüel yapacak",
        gardropsUrl: targetUrl,
        manualRequired: true,
      });
    }

    return res.status(400).json({ success: false, error: "Geçersiz action (check | mark-sold)" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
