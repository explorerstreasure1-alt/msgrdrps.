import { useState, useRef, useEffect } from "react";
import { useStore } from "../lib/store";

const SEGMENTS = [
  { label: "%5 İndirim", prize: "discount5" },
  { label: "%10 İndirim", prize: "discount10" },
  { label: "%15 İndirim", prize: "discount15" },
  { label: "%20 İndirim", prize: "discount20" },
  { label: "Hediye Ürün", prize: "gift" },
  { label: "50 Puan", prize: "points50" },
  { label: "100 Puan", prize: "points100" },
  { label: "Hızlı Kargo", prize: "fastship" },
];

const SEG = 360 / SEGMENTS.length;
const cx = 200, cy = 200, r = 200;

function slicePath(i: number): string {
  const a1 = ((i * SEG - 90) * Math.PI) / 180;
  const a2 = (((i + 1) * SEG - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy + r * Math.sin(a2);
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`;
}

function textPos(i: number) {
  const mid = ((i + 0.5) * SEG - 90) * (Math.PI / 180);
  const tr = r * 0.62;
  return { x: cx + tr * Math.cos(mid), y: cy + tr * Math.sin(mid) };
}

const COLORS = ["#f5efe4", "#eae1d0", "#f5efe4", "#eae1d0", "#f5efe4", "#eae1d0", "#f5efe4", "#eae1d0"];
const POOL = [0,0,0, 1,1,1, 2,2, 3, 4, 5,5, 6, 7,7,7];

function generateCode(): string {
  return "CW" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function SpinWheel({ onClose }: { onClose: () => void }) {
  const { currentUser, addSpinPrize, lastSpinDate, setLastSpinDate, addToast, addUserCoupon, addUserGift, addPoints, setFastShipping, userGifts, products, giftProductId, spinPrizes } = useStore();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ label: string; prize: string; code?: string } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [entering, setEntering] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setTimeout(() => setEntering(false), 400); return () => clearTimeout(t); }, []);

  const today = new Date().toDateString();
  const canSpin = !!currentUser && lastSpinDate !== today;

  let nextSpinTime = "";
  if (lastSpinDate === today) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    nextSpinTime = `${h}s ${m}d`;
  }

  const myLastSpins = spinPrizes.filter((s) => s.date > Date.now() - 86400000 * 7).slice(0, 10);

  const spin = () => {
    if (!canSpin || spinning || !currentUser) return;
    setSpinning(true);
    setResult(null);
    setCelebrate(false);

    const rolledIndex = POOL[Math.floor(Math.random() * POOL.length)];
    const seg = SEGMENTS[rolledIndex];
    const sliceCenter = rolledIndex * SEG + SEG / 2;
    const baseSpins = 6 * 360;
    const degreesToStop = (360 - sliceCenter) % 360;
    const totalRotation = baseSpins + degreesToStop;

    setRotation(totalRotation);
    setLastSpinDate(today);

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
      else if (seg.prize === "fastship") { setFastShipping(currentUser.id); msg = "Hızlı gönderim hakkı kazandın!"; }

      addToast(msg, "success");
      setResult({ label: seg.label, prize: seg.prize, code });
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 800);

      addSpinPrize({ id: Math.random().toString(36).slice(2, 10), prize: seg.prize, label: seg.label, date: Date.now() });
    }, 5000);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <div
        className="fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-sm -translate-y-1/2 rounded-3xl bg-[#fcfbfa] p-6 shadow-2xl border border-stone-200 transition-all duration-400"
        style={{ opacity: entering ? 0 : 1, transform: entering ? "translateY(20px) scale(0.96)" : "translateY(-50%) scale(1)" }}
      >
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-1 text-stone-400 hover:bg-stone-100 z-10">✕</button>

        <div className="mb-5 text-center">
          <h2 className="font-elegant text-xl font-semibold text-[#4a3e31] tracking-wide">Çarkı Çevir & Kazan</h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-stone-400">
            {canSpin ? "Her gün 1 çevirme hakkın var" : `Yarına kalan süre: ${nextSpinTime}`}
          </p>
          {!currentUser && <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 inline-block">Çevirmek için giriş yapmalısın</p>}
        </div>

        <div className="relative mx-auto mb-5 w-64 h-64 sm:w-72 sm:h-72">
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" style={{ filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.2))" }}>
            <svg width="28" height="38" viewBox="0 0 30 45" fill="#9c804d"><path d="M15 45 L30 10 C30 4 24 0 15 0 C6 0 0 4 0 10 Z" /></svg>
          </div>

          {celebrate && (
            <div className="absolute inset-0 z-20 rounded-full animate-ping" style={{ background: "radial-gradient(circle, #fbbf24, transparent 70%)", animationDuration: "0.8s" }} />
          )}

          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-stone-100 shadow-[0_15px_40px_rgba(184,161,127,0.25)] p-3.5">
            <div className="w-full h-full rounded-full border border-[#e8dec9] relative overflow-hidden">
              <div
                ref={wheelRef}
                className="w-full h-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? "transform 5s cubic-bezier(0.15, 0.8, 0.1, 1)" : "none",
                }}
              >
                <svg className="w-full h-full" viewBox="0 0 400 400">
                  {SEGMENTS.map((_, i) => (
                    <path key={i} d={slicePath(i)} fill={COLORS[i]} stroke="#fcfbfa" strokeWidth="2" />
                  ))}
                  {SEGMENTS.map((s, i) => {
                    const pos = textPos(i);
                    const midAngle = (i + 0.5) * SEG;
                    return (
                      <text key={i} x={pos.x} y={pos.y} transform={`rotate(${midAngle},${pos.x},${pos.y})`} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700" fill="#4a3e31" letterSpacing="0.5">
                        {s.label}
                      </text>
                    );
                  })}
                </svg>
              </div>
              <div className="absolute inset-[26%] rounded-full bg-[#fcfbfa] shadow-[inset_0_4px_10px_rgba(0,0,0,0.05)] flex items-center justify-center border-8 border-[rgba(234,225,208,0.5)]">
                <span className="text-[11px] font-bold text-[#4a3e31] text-center leading-tight tracking-wider">ÇEVİR<br/>& KAZAN</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={spin}
          disabled={!canSpin || spinning}
          className="mx-auto block rounded-full px-10 py-3.5 text-sm font-bold text-white tracking-wider shadow-lg transition-all duration-300 disabled:bg-stone-300 disabled:text-stone-400 disabled:shadow-none disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95"
          style={{
            background: spinning ? "#dcd9d4" : "linear-gradient(135deg, #cfb283 0%, #a68958 100%)",
            boxShadow: spinning ? "none" : "0 8px 20px rgba(166, 137, 88, 0.35)",
          }}
        >
          {spinning ? "Çevriliyor..." : "ŞANSINI DENE"}
        </button>

        {/* Result popup */}
        {result && (
          <div className="mt-5 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-6 text-center shadow-lg animate-slideUp">
            <div className="mb-3 text-5xl animate-bounce" style={{ animationDuration: "1s" }}>
              {result.prize === "gift" ? "🎁" : result.prize === "fastship" ? "🚀" : result.prize.startsWith("points") ? "⭐" : "🏷️"}
            </div>
            <p className="text-lg font-bold text-[#4a3e31]">Tebrikler!</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight" style={{ color: "#8c7343" }}>
              {result.prize === "gift" ? "HEDİYE ÜRÜN KAZANDIN!" :
               result.prize === "fastship" ? "HIZLI GÖNDERİM HAKKI!" :
               result.prize.startsWith("points") ? `${result.label} KAZANDIN!` :
               `${result.label} KUPONU KAZANDIN!`}
            </p>
            <p className="mt-2 text-sm text-stone-500">
              {result.prize === "gift" ? "Sepete gidip kullanabilirsin." :
               result.prize === "fastship" ? "Sonraki siparişinde öncelikli işlenir." :
               result.prize.startsWith("points") ? "Hesabına eklendi." :
               "Kodu sepette kullan."}
            </p>
            {(result.prize.startsWith("discount")) && result.code && (
              <div className="mt-4 inline-block rounded-full" style={{ background: "linear-gradient(135deg, #cfb283 0%, #a68958 100%)" }}>
                <span className="block px-6 py-2 text-base font-bold tracking-[0.25em] text-white">{result.code}</span>
              </div>
            )}
          </div>
        )}

        {/* History toggle */}
        {myLastSpins.length > 0 && !spinning && (
          <div className="mt-4 text-center">
            <button onClick={() => setShowHistory(!showHistory)} className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600 transition">
              {showHistory ? "Gizle" : `Son 7 gün (${myLastSpins.length} çevirme)`}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                {myLastSpins.map((s) => (
                  <div key={s.id} className="rounded-lg bg-stone-50 px-3 py-1.5 text-xs flex items-center justify-between">
                    <span className={
                      "font-medium " + (
                        s.prize === "gift" ? "text-rose-700" :
                        s.prize === "fastship" ? "text-blue-700" :
                        s.prize.startsWith("points") ? "text-emerald-700" : "text-amber-700"
                      )
                    }>
                      {s.prize === "gift" ? "🎁 Hediye" :
                       s.prize === "fastship" ? "🚀 Hızlı Gönderim" :
                       s.prize.startsWith("points") ? `⭐ ${s.label}` : `🏷️ ${s.label}`}
                    </span>
                    <span className="text-stone-400">{new Date(s.date).toLocaleDateString("tr-TR")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
