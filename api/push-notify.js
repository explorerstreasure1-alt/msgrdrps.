import { list } from "@vercel/blob";
import webpush from "web-push";

const SUBS_FILE = "push-subs.json";

webpush.setVapidDetails(
  "mailto:admin@msgrdrps.com",
  process.env.VAPID_PUBLIC_KEY || "BPdJDzUrtfItf1MCf4yb9ykYUs1xRfclwUbs3NdWh6-6RfMYrdIH3-oFmK2keE1eBT0NxN71gHrUJr9ibSXjQD4",
  process.env.VAPID_PRIVATE_KEY || "",
);

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const { userId, title, body, url } = req.body;
    if (!userId) return res.json({ success: false, error: "userId gerekli" });

    const subs = await loadSubs();
    const sub = subs[userId];
    if (!sub) return res.json({ success: false, error: "Abone bulunamadı." });

    try {
      await webpush.sendNotification(sub, JSON.stringify({ title, body, url: url || "/" }));
      return res.json({ success: true });
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        const { put } = await import("@vercel/blob");
        delete subs[userId];
        await put(SUBS_FILE, JSON.stringify(subs), {
          contentType: "application/json",
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
        });
      }
      return res.json({ success: false, error: err.message });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
