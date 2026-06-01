import { useRef, useState } from "react";
import { useStore, type Product } from "../lib/store";

function ConditionBadge({ condition }: { condition: "new" | "second" }) {
  if (condition === "new") {
    return (
      <span className="rounded-full bg-emerald-600/90 px-1 py-0 text-[7px] font-semibold text-white leading-none">
        SIFIR
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-600/90 px-1 py-0 text-[7px] font-semibold text-white leading-none">
      2.EL
    </span>
  );
}

/* Gold dust falling particles for discounted products */
function GoldShimmer() {
  const particles = Array.from({ length: 16 }, (_, __) => ({
    left: Math.random() * 100,
    delay: Math.random() * 2.5,
    duration: 2.5 + Math.random() * 1.5,
    size: 2 + Math.random() * 3,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <style>{`
        @keyframes dustFall {
          0%   { transform: translateY(-10px) scale(0); opacity: 0; }
          15%  { opacity: 1; transform: translateY(10px) scale(1); }
          80%  { opacity: 0.8; }
          100% { transform: translateY(120px) scale(0.3); opacity: 0; }
        }
      `}</style>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: "-5%",
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#f59e0b" : "#fde68a",
            boxShadow: "0 0 3px 1px rgba(251,191,36,0.3)",
            animation: `dustFall ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function ProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) {
  const { compareIds, toggleCompare } = useStore();
  const [imgIndex, setImgIndex] = useState(0);
  const imgs = product.images.length ? product.images : [""];
  const discounted = product.hasDiscount && product.originalPriceNum && product.originalPriceNum > product.priceNum;
  const cardRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (y - 0.5) * -35, y: (x - 0.5) * 35 });
  };

  /* light position moves with mouse for dynamic shadow/glare */
  const lightX = tilt.y / 35;
  const lightY = tilt.x / 35;

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setTilt({ x: 0, y: 0 }); }}
      className="group relative flex w-full flex-col rounded-xl border border-stone-200 bg-white text-left overflow-hidden"
      style={{
        perspective: "1000px",
        boxShadow: isHovered
          ? `${-lightY * 15}px ${lightX * 15}px 30px -10px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.1)`
          : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.3s ease-out",
      }}
    >
      <div
        className="relative aspect-[3/4]"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isHovered ? "transform 0.08s ease-out" : "transform 0.5s ease-out",
        }}
      >
        {/* Outer wall surface (behind the niche) */}
        <div className="absolute inset-0 rounded-t-xl bg-gradient-to-br from-stone-400 via-stone-200 to-stone-500" style={{ zIndex: 0 }} />

        {/* The niche / hole (on top of wall) */}
        <div className="absolute inset-[10%] rounded-xl overflow-hidden" style={{ zIndex: 1 }}>
          {(product.status === "out" || product.stock === 0) ? (
            <div className="relative h-full w-full">
              <img
                src={imgs[0]}
                alt={product.name}
                className="h-full w-full object-cover opacity-40"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-bold text-white tracking-widest">STOKTA YOK</div>
            </div>
          ) : imgs[imgIndex] ? (
            <div className="relative h-full w-full">
              <img
                src={imgs[imgIndex]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400 bg-stone-300">Görsel yok</div>
          )}
        </div>

        {/* Dynamic shadow inside niche — moves opposite to light */}
        <div className="absolute inset-[10%] z-10 rounded-xl pointer-events-none" style={{
          boxShadow: isHovered
            ? `inset ${-lightY * 20}px ${lightX * 20}px 40px -10px rgba(0,0,0,0.6), inset ${lightY * 4}px ${-lightX * 4}px 10px -4px rgba(255,255,255,0.15)`
            : "inset 0 0 20px rgba(0,0,0,0.25)",
          transition: "box-shadow 0.08s ease-out",
        }} />

        {/* Niche wall thickness — 4 sides with dynamic lighting */}
        <div className="absolute left-[10%] right-[10%] top-[10%] z-10 h-[35%] rounded-t-xl pointer-events-none" style={{
          background: isHovered
            ? `linear-gradient(180deg, rgba(0,0,0,${0.2 - lightY * 0.1}) 0%, transparent 100%)`
            : "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 100%)",
        }} />
        <div className="absolute bottom-[10%] left-[10%] right-[10%] z-10 h-[30%] rounded-b-xl pointer-events-none" style={{
          background: isHovered
            ? `linear-gradient(0deg, rgba(0,0,0,${0.15 + lightY * 0.1}) 0%, transparent 100%)`
            : "linear-gradient(0deg, rgba(0,0,0,0.12) 0%, transparent 100%)",
        }} />
        <div className="absolute left-[10%] top-[10%] bottom-[10%] z-10 w-[22%] rounded-l-xl pointer-events-none" style={{
          background: isHovered
            ? `linear-gradient(90deg, rgba(0,0,0,${0.12 - lightX * 0.08}) 0%, transparent 100%)`
            : "linear-gradient(90deg, rgba(0,0,0,0.1) 0%, transparent 100%)",
        }} />
        <div className="absolute right-[10%] top-[10%] bottom-[10%] z-10 w-[22%] rounded-r-xl pointer-events-none" style={{
          background: isHovered
            ? `linear-gradient(270deg, rgba(0,0,0,${0.12 + lightX * 0.08}) 0%, transparent 100%)`
            : "linear-gradient(270deg, rgba(0,0,0,0.1) 0%, transparent 100%)",
        }} />

        {/* Dynamic glare / shine that follows the light source */}
        <div className="absolute inset-0 z-20 rounded-t-xl pointer-events-none overflow-hidden" style={{
          opacity: isHovered ? 0.5 : 0,
          background: `radial-gradient(circle at ${50 + lightX * 40}% ${50 + lightY * 40}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
          transition: "opacity 0.15s ease-out",
        }} />

        {/* Outer rim bevel */}
        <div className="absolute inset-0 z-0 rounded-t-xl pointer-events-none shadow-[inset_0_1px_3px_rgba(255,255,255,0.5),inset_0_-1px_2px_rgba(0,0,0,0.15)]" />

        {/* badges: discount > category > condition */}
        <div className="absolute left-0.5 top-0.5 z-30 flex flex-col gap-0">
          {discounted && (
            <span className="rounded-full bg-red-600 px-1 py-0 text-[7px] font-bold text-white shadow-sm text-center leading-none">
              %{product.discount || Math.round(((product.originalPriceNum! - product.priceNum) / product.originalPriceNum!) * 100)} İND.
            </span>
          )}
          <span className="rounded-full bg-white/90 px-1 py-0 text-[7px] font-semibold text-stone-700 shadow-sm leading-none">
            {product.category}
          </span>
          <ConditionBadge condition={product.condition} />
        </div>

        {/* "İncele" overlay inside the niche */}
        <div className="absolute inset-[12%] z-20 flex items-center justify-center bg-black/10 opacity-0 transition group-hover:opacity-100 rounded-xl pointer-events-none">
          <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-stone-800 shadow-md">
            İncele
          </span>
        </div>

        {imgs.length > 1 && (
          <div className="absolute bottom-[14%] left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {imgs.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIndex(i);
                }}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (i === imgIndex ? "w-4 bg-stone-800" : "w-1.5 bg-stone-400/60")
                }
              />
            ))}
          </div>
        )}

        {/* Gold dust on hover for discounted — full card area */}
        {discounted && (
          <div className="pointer-events-none absolute inset-0 z-30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <GoldShimmer />
          </div>
        )}

        {/* Compare button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleCompare(product.id); }}
          className={"absolute right-2 top-9 z-30 flex h-6 w-6 items-center justify-center rounded-full border text-xs transition " + (compareIds.includes(product.id) ? "border-amber-400 bg-amber-100 text-amber-700" : "border-stone-300 bg-white/80 text-stone-500 hover:bg-white hover:shadow")}
          title="Karşılaştır"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
        </button>
      </div>

      <div className="p-3">
        <h3 className="line-clamp-1 font-medium text-stone-800">{product.name}</h3>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {discounted && product.originalPrice ? (
              <>
                <span className="text-[11px] text-stone-400 line-through decoration-red-500">
                  {product.originalPrice}
                </span>
                <span className="text-base font-bold text-red-600">{product.price}</span>
              </>
            ) : (
              <span className="text-base font-semibold text-stone-800">
                {product.price}
              </span>
            )}
          </div>
          <span className="text-[11px] text-stone-400">Stok: {product.stock}</span>
        </div>
      </div>
    </button>
  );
}
