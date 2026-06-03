export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: "imageUrl gerekli" });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "MISTRAL_API_KEY environment variable eksik" });
    }

    const content = [
      {
        type: "text",
        text: `Sen bir moda ürün asistanısın. Verilen görseldeki giyim/aksesuar ürününü analiz et ve **sadece JSON** döndür, başka hiçbir metin yazma.

Döndüreceğin JSON formatı:
{
  "name": "Türkçe ürün adı (kısa, açıklayıcı, max 60 karakter)",
  "description": "Türkçe ürün açıklaması (2-3 cümle, ürünün özellikleri, kumaş, kesim, stil)",
  "slogan": "Türkçe kısa slogan (max 40 karakter, çekici)",
  "category": "Ürün kategorisi (şunlardan biri: Elbise, Mont & Kaban, Triko & Hırka, Gömlek & Bluz, Pantolon & Kot, Etek, Sweat & Hoodie, Ceket & Blazer, Tulum, Takım, Ayakkabı, Çanta, Aksesuar, Ev & Pijama, Şort, Diğer)",
  "brand": "Marka adı (eğer görselde marka görünüyorsa yaz, yoksa boş string bırak)"
}`,
      },
      {
        type: "image_url",
        image_url: imageUrl.startsWith("http") ? imageUrl : imageUrl,
      },
    ];

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "pixtral-large-latest",
        messages: [{ role: "user", content }],
        max_tokens: 1000,
        temperature: 0.1,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      return res.status(502).json({ success: false, error: `Mistral API hatası ${response.status}: ${errBody.slice(0, 300)}` });
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    } catch {
      return res.status(502).json({ success: false, error: "Mistral AI JSON döndürmedi", raw: text.slice(0, 500) });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: (parsed.name || "").trim(),
        description: (parsed.description || "").trim(),
        slogan: (parsed.slogan || "").trim(),
        category: (parsed.category || "Diğer").trim(),
        brand: (parsed.brand || "").trim(),
      },
    });
  } catch (error) {
    console.log("ai-describe HATA:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
