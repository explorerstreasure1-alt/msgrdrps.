import { put, list, del } from "@vercel/blob";

const SUBS_FILE = "push-subs.json";

async function loadSubs() {
  try {
    const { blobs } = await list({ prefix: SUBS_FILE, limit: 1 });
    if (!blobs.length) return {};
    const res = await fetch(blobs[0].url + "?_=" + Date.now());
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}

async function saveSubs(subs) {
  await put(SUBS_FILE, JSON.stringify(subs), {
    contentType: "application/json",
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const { userId, subscription } = req.body;
    if (!userId) return res.json({ success: false, error: "userId gerekli" });

    const subs = await loadSubs();
    if (subscription) {
      subs[userId] = subscription;
    } else {
      delete subs[userId];
    }
    await saveSubs(subs);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
