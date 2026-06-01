import { useState, useRef, useEffect } from "react";
import { useStore } from "../lib/store";

const SEGMENTS = [
  { label: "%5 İndirim", icon: "💵", prize: "discount5" },
  { label: "%10 İndirim", icon: "💰", prize: "discount10" },
  { label: "%15 İndirim", icon: "💎", prize: "discount15" },
  { label: "%20 İndirim", icon: "👑", prize: "discount20" },
  { label: "Hediye Ürün", icon: "🎁", prize: "gift" },
  { label: "50 Puan", icon: "⭐", prize: "points50" },
  { label: "100 Puan", icon: "🌟", prize: "points100" },
  { label: "Hızlı Kargo", icon: "🚀", prize: "fastship" },
];

const SEG = 360 / SEGMENTS.length;
const R = 200;

function slicePath(i: number): string {
  const a1 = ((i * SEG - 90) * Math.PI) / 180;
  const a2 = (((i + 1) * SEG - 90) * Math.PI) / 180;
  const x1 = R + R * Math.cos(a1);
  const y1 = R + R * Math.sin(a1);
  const x2 = R + R * Math.cos(a2);
  const y2 = R + R * Math.sin(a2);
  return `M${R},${R} L${x1},${y1} A${R},${R} 0 0,1 ${x2},${y2} Z`;
}

function pos(i: number, radius: number) {
  const mid = ((i + 0.5) * SEG - 90) * (Math.PI / 180);
  return { x: R + radius * Math.cos(mid), y: R + radius * Math.sin(mid) };
}

// Alternating rich beige/gold tones
const COLORS = [
  "#f5efe4", // cream
  "#e8dccc", // light beige
  "#f0e8d9", // warm cream
  "#dfd0ba", // stone beige
  "#f5efe4",
  "#e8dccc",
  "#f0e8d9",
  "#dfd0ba",
];

const POOL = [0,0,0, 1,1,1, 2,2, 3, 4, 5,5, 6, 7,7,7];

export default function SpinWheel({ onClose }: { onClose: () => void }) {
  const { currentUser, addSpinPrize, lastSpinDate, setLastSpinDate, addToast, addUserCoupon, addUserGift, addPoints, setFastShipping, userGifts, products, giftProductId, spinPrizes } = useStore();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ label: string; icon: string; prize: string; code?: string } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [entering, setEntering] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setTimeout(() => setEntering(false), 400); return () => clearTimeout(t); }, []);

  const today = new Date().toDateString();
  const canSpin = !!currentUser && lastSpinDate !== today;

  let nextSpinTime = "";
  if (lastSpinDate === today) {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    tom.setHours(0, 0, 0, 0);
    const diff = tom.getTime() - Date.now();
    nextSpinTime = `${Math.floor(diff / 3600000)}s ${Math.floor((diff % 3600000) / 60000)}d`;
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
    const baseSpins = 8 * 360;
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
        if (gp && !userGifts.some((g) => g.productId === gp.id && !g.claimed)) addUserGift(currentUser.id, gp.id, gp.name);
        msg = gp ? `${gp.name} hediye kazandın!` : "Hediye kazandın!";
      }
      else if (seg.prize === "points50") { addPoints(currentUser.id, 50); msg = "50 sadakat puanı kazandın!"; }
      else if (seg.prize === "points100") { addPoints(currentUser.id, 100); msg = "100 sadakat puanı kazandın!"; }
      else if (seg.prize === "fastship") { setFastShipping(currentUser.id); msg = "Hızlı gönderim hakkı kazandın!"; }

      addToast(msg, "success");
      setResult({ label: seg.label, icon: seg.icon, prize: seg.prize, code });
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 800);

      addSpinPrize({ id: Math.random().toString(36).slice(2, 10), prize: seg.prize, label: seg.label, date: Date.now() });
    }, 5500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-[#fcfbfa] p-5 shadow-2xl border border-stone-200 transition-all duration-400"
        style={{ opacity: entering ? 0 : 1, transform: entering ? "translateY(20px) scale(0.96)" : "scale(1)" }}
      >
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-1 text-stone-400 hover:bg-stone-100 z-10">✕</button>

        <div className="mb-4 text-center">
          <h2 className="font-elegant text-xl font-semibold text-[#4a3e31] tracking-wide">Çarkı Çevir & Kazan</h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-stone-400">
            {canSpin ? "Her gün 1 çevirme hakkın var" : `Yarına kalan: ${nextSpinTime}`}
          </p>
          {!currentUser && <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 inline-block">Çevirmek için giriş yapmalısın</p>}
        </div>

        <div className="relative mx-auto mb-4 w-64 h-64 sm:w-72 sm:h-72">
          {/* Pointer */}
          <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2" style={{ filter: "drop-shadow(0 5px 6px rgba(0,0,0,0.3))" }}>
            <svg width="26" height="36" viewBox="0 0 30 45" fill="url(#goldGrad)"><defs><linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4af37"/><stop offset="100%" stopColor="#8c7343"/></linearGradient></defs><path d="M15 45 L30 10 C30 4 24 0 15 0 C6 0 0 4 0 10 Z" /></svg>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-500 shadow-md" />
          </div>

          {/* Flash */}
          {celebrate && (
            <div className="absolute inset-0 z-20 rounded-full animate-ping" style={{ background: "radial-gradient(circle, #fbbf24, transparent 70%)", animationDuration: "0.8s" }} />
          )}

          {/* Decorative outer ring */}
          <div className="absolute inset-0 rounded-full p-[5px]" style={{ background: "linear-gradient(135deg, #d4af37, #a68958, #d4af37)" }}>
            <div className="w-full h-full rounded-full bg-gradient-to-b from-white to-stone-100 shadow-[0_15px_40px_rgba(184,161,127,0.35)] p-[3px]">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#f5efe4] to-[#dfd0ba] p-2.5">
                <div className="w-full h-full rounded-full border border-[#c4a99a]/40 relative overflow-hidden shadow-inner">
                  {/* Decorative dots around the rim */}
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const angle = (i * 15 - 90) * (Math.PI / 180);
                      const dr = 88;
                      const dx = 50 + dr * Math.cos(angle);
                      const dy = 50 + dr * Math.sin(angle);
                      return (
                        <div key={i} className="absolute w-1 h-1 rounded-full bg-[#c4a99a]/40" style={{ left: `${dx}%`, top: `${dy}%` }} />
                      );
                    })}
                  </div>

                  {/* Wheel */}
                  <div
                    ref={wheelRef}
                    className="w-full h-full"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: spinning ? "transform 5.5s cubic-bezier(0.12, 0.8, 0.08, 1)" : "none",
                    }}
                  >
                    <svg className="w-full h-full" viewBox="0 0 400 400">
                      {SEGMENTS.map((_, i) => (
                        <path key={i} d={slicePath(i)} fill={COLORS[i]} stroke="#fcfbfa" strokeWidth="2.5" />
                      ))}
                      {/* Segment divider lines (white) */}
                      {SEGMENTS.map((_, i) => {
                        const a = ((i * SEG - 90) * Math.PI) / 180;
                        const x1 = R + (R - 12) * Math.cos(a);
                        const y1 = R + (R - 12) * Math.sin(a);
                        const x2 = R + 42 * Math.cos(a);
                        const y2 = R + 42 * Math.sin(a);
                        return <line key={`div-${i}`} x1={x2} y1={y2} x2={x1} y2={y1} stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />;
                      })}
                      {/* Icons */}
                      {SEGMENTS.map((s, i) => {
                        const p = pos(i, 50);
                        return (
                          <text key={`icon-${i}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="18">
                            {s.icon}
                          </text>
                        );
                      })}
                      {/* Labels */}
                      {SEGMENTS.map((s, i) => {
                        const p = pos(i, 130);
                        return (
                          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="700" fill="#4a3e31" letterSpacing="0.3">
                            {s.label}
                          </text>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Center hub */}
                  <div className="absolute inset-[29%] rounded-full flex items-center justify-center" style={{
                    background: "radial-gradient(circle at 40% 40%, #fcfbfa, #efe5d4)",
                    boxShadow: "inset 0 4px 12px rgba(0,0,0,0.08), 0 0 0 6px rgba(196,169,154,0.3)",
                  }}>
                    <div className="text-center">
                      <svg className="mx-auto mb-0.5" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a68958" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/></svg>
                      <span className="block text-[10px] font-bold text-[#8c7343] tracking-[0.15em] leading-tight">ÇEVİR<br/>KAZAN</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={spin}
          disabled={!canSpin || spinning}
          className="mx-auto block rounded-full px-10 py-3 text-sm font-bold text-white tracking-wider shadow-lg transition-all duration-300 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95"
          style={{
            background: !canSpin ? "#d6d3d1" : spinning ? "#dcd9d4" : "linear-gradient(135deg, #d4af37, #a68958, #8c7343)",
            boxShadow: !canSpin || spinning ? "none" : "0 8px 25px rgba(166, 137, 88, 0.4)",
            color: !canSpin ? "#a8a29e" : "#ffffff",
          }}
        >
          {spinning ? "✨ Çevriliyor..." : !canSpin ? (!currentUser ? "🔒 Giriş Yap" : "⏰ Yarın Gel") : "🎯 ŞANSINI DENE"}
        </button>

        {/* Result popup */}
        {result && (
          <div className="mt-4 rounded-2xl border-2 border-[#d4af37] bg-gradient-to-br from-amber-50 via-white to-rose-50 p-5 text-center shadow-xl animate-slideUp relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-200/30 rounded-full blur-xl" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-rose-200/30 rounded-full blur-xl" />
            <div className="relative">
              <div className="mb-2 text-5xl animate-bounce" style={{ animationDuration: "1s" }}>{result.icon}</div>
              <p className="text-lg font-bold text-[#4a3e31]">🎉 Tebrikler!</p>
              <p className="mt-1 text-xl font-extrabold tracking-tight" style={{ color: "#8c7343" }}>
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
                <div className="mt-3 inline-block rounded-full px-6 py-2" style={{ background: "linear-gradient(135deg, #d4af37, #a68958)" }}>
                  <span className="text-base font-bold tracking-[0.25em] text-white">{result.code}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {myLastSpins.length > 0 && !spinning && (
          <div className="mt-3 text-center">
            <button onClick={() => setShowHistory(!showHistory)} className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600 transition">
              {showHistory ? "▲ Gizle" : `▼ Son 7 gün (${myLastSpins.length})`}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                {myLastSpins.map((s) => {
                  const seg = SEGMENTS.find((x) => x.prize === s.prize);
                  return (
                    <div key={s.id} className="rounded-lg bg-stone-50 px-3 py-1.5 text-xs flex items-center justify-between">
                      <span className="font-medium text-stone-700">
                        {seg?.icon || "🎯"} {s.label}
                      </span>
                      <span className="text-stone-400">{new Date(s.date).toLocaleDateString("tr-TR")}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
