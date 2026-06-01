import { useState, useRef } from "react";
import { useStore } from "../lib/store";

const SEGMENTS = [
  { label: "%5", prize: "discount5", color: "#fde68a" },
  { label: "%10", prize: "discount10", color: "#fbbf24" },
  { label: "%15", prize: "discount15", color: "#f59e0b" },
  { label: "HEDİYE", prize: "gift", color: "#d4a0a0" },
  { label: "%5", prize: "discount5", color: "#fef3c7" },
  { label: "%10", prize: "discount10", color: "#fcd34d" },
  { label: "%15", prize: "discount15", color: "#d97706" },
  { label: "HEDİYE", prize: "gift", color: "#e8b4b4" },
];

const SEG = 360 / SEGMENTS.length;

export default function SpinWheel({ onClose }: { onClose: () => void }) {
  const { currentUser, addSpinPrize, lastSpinDate, setLastSpinDate, addToast } = useStore();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ label: string; prize: string } | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const canSpin = currentUser && lastSpinDate !== new Date().toDateString();

  const spin = () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    const targetIdx = Math.floor(Math.random() * SEGMENTS.length);
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetAngle = extraSpins * 360 + targetIdx * SEG + SEG / 2;

    const currentRotation = rotation % 360;
    const finalRotation = rotation + (targetAngle - (rotation % 360)) + 360;

    setRotation(finalRotation);
    setLastSpinDate(new Date().toDateString());

    setTimeout(() => {
      const seg = SEGMENTS[targetIdx];
      setResult(seg);
      setSpinning(false);
      const msg = seg.prize === "gift" ? "🎁 Hediye kazandın!" : `${seg.label} indirim kazandın!`;
      addToast(msg, "success");
      addSpinPrize({
        id: Math.random().toString(36).slice(2, 10),
        prize: seg.prize,
        label: seg.label,
        date: Date.now(),
      });
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
        </div>

        <div className="relative mx-auto mb-5 w-64 h-64">
          {/* Pointer */}
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
            <svg width="24" height="20" viewBox="0 0 24 20" fill="#44403c"><path d="M12 20L0 0h24z"/></svg>
          </div>

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full shadow-lg"
            style={{
              background: `conic-gradient(${SEGMENTS.map((s, i) => `${s.color} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(", ")})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            {/* Center circle */}
            <div className="absolute inset-[30%] flex items-center justify-center rounded-full bg-white shadow-inner">
              <span className="text-[10px] font-bold text-stone-700 text-center leading-tight">ÇEVİR<br/>& KAZAN</span>
            </div>
          </div>

          {/* Segment labels */}
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
                      color: s.prize === "gift" ? "#7c2d2d" : "#92400e",
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
              {result.prize === "gift"
                ? "🎁 HEDİYE KAZANDIN! Hediye kodun:"
                : `🎉 ${result.label} İNDİRİM KAZANDIN!`}
            </p>
            {result.prize === "gift" ? (
              <p className="mt-1 text-lg font-bold text-amber-900 tracking-wider">
                {Math.random().toString(36).slice(2, 8).toUpperCase()}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-700">
                Sepette otomatik uygulanır.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
