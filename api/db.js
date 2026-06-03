import { put, head, list } from "@vercel/blob";

const STORE_FILE = "store.json";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const { blobs } = await list({ prefix: STORE_FILE, limit: 1 });
      if (blobs.length === 0) {
        return res.status(200).json({ success: true, data: null });
      }
      const blobUrl = blobs[0].url;
      const response = await fetch(blobUrl);
      if (!response.ok) {
        return res.status(200).json({ success: true, data: null });
      }
      const data = await response.json();
      return res.status(200).json({ success: true, data });
    }

    if (req.method === "POST") {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ success: false, error: "data gerekli" });
      }
      const blob = await put(STORE_FILE, JSON.stringify(data), {
        contentType: "application/json",
        access: "public",
        addRandomSuffix: false,
      });
      return res.status(200).json({ success: true, url: blob.url });
    }

    return res.status(405).json({ message: "Sadece GET/POST" });
  } catch (error) {
    console.log("db HATA:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
