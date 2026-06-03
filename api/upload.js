import { put } from "@vercel/blob";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const ct = req.headers["content-type"] || "";

    let buffer;
    let contentType;

    if (ct.includes("application/json")) {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      await new Promise((resolve, reject) => {
        req.on("end", resolve);
        req.on("error", reject);
      });
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const base64 = body.image;
      if (!base64) {
        return res.status(400).json({ success: false, error: "image gerekli (base64)" });
      }
      const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ success: false, error: "Geçersiz base64" });
      }
      contentType = matches[1];
      buffer = Buffer.from(matches[2], "base64");
    } else {
      contentType = ct || "image/jpeg";
      buffer = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
    }

    const ext = contentType.split("/").pop() || "jpg";
    const name = `product-${Date.now()}.${ext}`;

    const blob = await put(name, buffer, {
      contentType,
      access: "public",
      addRandomSuffix: true,
    });

    return res.status(200).json({ success: true, url: blob.url });
  } catch (error) {
    console.log("upload HATA:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
