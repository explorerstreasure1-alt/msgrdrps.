export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const { phone, message, usercode, password, header } = req.body;
    if (!phone || !message) return res.json({ success: false, error: "Eksik bilgi." });
    if (!usercode || !password) {
      return res.json({ success: false, error: "SMS ayarları eksik (kullanıcı kodu/şifre)." });
    }

    const params = new URLSearchParams({
      usercode,
      password,
      gsmno: phone.replace(/[^0-9]/g, ""),
      message: message.slice(0, 160),
      msgheader: header || "MSGrdrps",
      dil: "TR",
    });

    const smsRes = await fetch(`https://api.netgsm.com.tr/sms/send/get?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    const text = await smsRes.text();
    const code = parseInt(text.trim(), 10);

    if (code > 0) {
      return res.json({ success: true, ref: code });
    }

    const errors = {
      20: "Geçersiz kullanıcı/şifre",
      30: "Geçersiz numara",
      40: "Geçersiz başlık",
      70: "Hatalı sorgu",
      80: "Rapor bekliyor",
      85: "Bakiye yetersiz",
    };
    return res.json({ success: false, error: errors[code] || `NetGSM hata kodu: ${code}` });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
}
