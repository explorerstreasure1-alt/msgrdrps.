import { put } from "@vercel/blob";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

    const ct = req.headers["content-type"] || "image/jpeg";
    const ext = ct.split("/").pop() || "jpg";
    const name = `product-${Date.now()}.${ext}`;

    const blob = await put(name, buffer, {
      contentType: ct,
      access: "public",
      addRandomSuffix: true,
    });

    return res.status(200).json({ success: true, url: blob.url });
  } catch (error) {
    console.log("upload HATA:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
