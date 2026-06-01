import { useState, useRef } from "react";
import { useStore } from "../lib/store";

const SEGMENTS = [
  { label: "%5", prize: "discount5", color: "#fde68a" },
  { label: "%10", prize: "discount10", color: "#fbbf24" },
  { label: "HEDİYE", prize: "gift", color: "#d4a0a0" },
  { label: "50 Puan", prize: "points50", color: "#a7f3d0" },
  { label: "%15", prize: "discount15", color: "#f59e0b" },
  { label: "100 Puan", prize: "points100", color: "#6ee7b7" },
  { label: "HIZLI", prize: "fastship", color: "#bfdbfe" },
  { label: "%20", prize: "discount20", color: "#d97706" },
];

const SEG = 360 / SEGMENTS.length;

export default function SpinWheel({ onClose }: { onClose: () => void }) {
  const { currentUser, addSpinPrize, lastSpinDate, setLastSpinDate, addToast, addUserCoupon, addUserGift, addPoints, setFastShipping, userGifts, products, giftProductId, userCoupons } = useStore();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ label: string; prize: string; code?: string } | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const canSpin = currentUser && lastSpinDate !== new Date().toDateString();

  const spin = () => {
    if (!canSpin || spinning || !currentUser) return;
    setSpinning(true);
    setResult(null);

    const targetIdx = Math.floor(Math.random() * SEGMENTS.length);
    const seg = SEGMENTS[targetIdx];
    const extraSpins = 5 + Math.floor(Math.random() * 4);
    const targetAngle = extraSpins * 360 + targetIdx * SEG + SEG / 2;
    const currentRotation = rotation % 360;
    const finalRotation = rotation + (targetAngle - (rotation % 360)) + 360;

    setRotation(finalRotation);
    setLastSpinDate(new Date().toDateString());

    setTimeout(() => {
      setSpinning(false);
      let msg = "";
      let code = "";
      if (seg.prize === "discount5") { code = addUserCoupon(currentUser.id, 5); msg = "%5 indirim kuponu kazandın!"; }
      else if (seg.prize === "discount10") { code = addUserCoupon(currentUser.id, 10); msg = "%10 indirim kuponu kazandın!"; }
      else if (seg.prize === "discount15") { code = addUserCoupon(currentUser.id, 15); msg = "%15 indirim kuponu kazandın!"; }
      else if (seg.prize === "discount20") { code = addUserCoupon(currentUser.id, 20); msg = "%20 indirim kuponu kazandın!"; }
      else if (seg.prize === "gift") {
        const gp = products.find((p) => p.id === giftProductId) || products[0];
        if (gp && !userGifts.some((g) => g.productId === gp.id && !g.claimed)) {
          addUserGift(currentUser.id, gp.id, gp.name);
        }
        msg = gp ? `${gp.name} hediye kazandın! Sepette kullan.` : "Hediye kazandın!";
      }
      else if (seg.prize === "points50") { addPoints(currentUser.id, 50); msg = "50 sadakat puanı kazandın!"; }
      else if (seg.prize === "points100") { addPoints(currentUser.id, 100); msg = "100 sadakat puanı kazandın!"; }
      else if (seg.prize === "fastship") { setFastShipping(currentUser.id); msg = "Hızlı gönderim hakkı kazandın! Sonraki siparişinde öncelikli."; }

      addToast(msg, "success");
      setResult({ label: seg.label, prize: seg.prize, code });
      addSpinPrize({ id: Math.random().toString(36).slice(2, 10), prize: seg.prize, label: seg.label, date: Date.now() });
    }, 4000);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <div className="fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-1 text-stone-400 hover:bg-stone-100">✕</button>

        <div className="mb-4 text-center">
          <h2 className="font-elegant text-lg font-semibold text-stone-800">Çarkı Çevir & Kazan</h2>
          {!currentUser && <p className="mt-1 text-xs text-stone-500">Çevirmek için giriş yapmalısın.</p>}
          {currentUser && !canSpin && <p className="mt-1 text-xs text-amber-600">Bugün çevirdin! Yarın tekrar gel.</p>}
          {currentUser && <p className="mt-1 text-xs text-stone-400">Puanın: {currentUser.points || 0}</p>}
        </div>

        <div className="relative mx-auto mb-5 w-64 h-64">
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
            <svg width="24" height="20" viewBox="0 0 24 20" fill="#44403c"><path d="M12 20L0 0h24z"/></svg>
          </div>

          <div
            ref={wheelRef}
            className="w-full h-full rounded-full shadow-lg"
            style={{
              background: `conic-gradient(${SEGMENTS.map((s, i) => `${s.color} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(", ")})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            <div className="absolute inset-[30%] flex items-center justify-center rounded-full bg-white shadow-inner">
              <span className="text-[10px] font-bold text-stone-700 text-center leading-tight">ÇEVİR<br/>& KAZAN</span>
            </div>
          </div>

          <div className="absolute inset-0 pointer-events-none">
            {SEGMENTS.map((s, i) => {
              const angle = i * SEG + SEG / 2 - 90;
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 origin-bottom"
                  style={{ transform: `rotate(${angle}deg) translateY(-50%)`, width: "50%", paddingLeft: "8px" }}
                >
                  <span
                    className="block text-[9px] font-bold tracking-wider drop-shadow-sm"
                    style={{
                      color: s.prize === "gift" ? "#7c2d2d" : s.prize === "fastship" ? "#1e40af" : s.prize.startsWith("points") ? "#065f46" : "#92400e",
                      textShadow: "0 0 2px rgba(255,255,255,0.6)",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={spin}
          disabled={!canSpin || spinning}
          className="mx-auto block rounded-full bg-stone-800 px-8 py-3 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-40 transition"
        >
          {spinning ? "Çevriliyor..." : result ? "Tekrar Çevir" : "Çarkı Çevir"}
        </button>

        {result && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center animate-bounce-in">
            <p className="text-sm font-semibold text-amber-800">
              {result.prize === "gift" ? "🎁 HEDİYE ÜRÜN KAZANDIN! Sepette kullanabilirsin." :
               result.prize === "fastship" ? "🚀 HIZLI GÖNDERİM HAKKI! Sonraki siparişinde öncelikli işlenir." :
               result.prize.startsWith("points") ? `⭐ ${result.label} sadakat puanı hesabına eklendi!` :
               `🎉 ${result.label} İNDİRİM KUPONU KAZANDIN!`}
            </p>
            {(result.prize === "discount5" || result.prize === "discount10" || result.prize === "discount15" || result.prize === "discount20") && result.code && (
              <p className="mt-1 text-xs text-amber-700">
                Kod: <span className="font-bold tracking-wider">{result.code}</span> — sepette kullan
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
