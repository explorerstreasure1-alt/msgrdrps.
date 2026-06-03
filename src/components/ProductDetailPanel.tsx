import { useRef, useState, useMemo } from "react";
import { useStore, type Product } from "../lib/store";
import { Stars } from "./Stars";

function ConditionBadge({ condition }: { condition: "new" | "second" }) {
  if (condition === "new") {
    return <span className="rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white">SIFIR</span>;
  }
  return <span className="rounded-full bg-amber-600/90 px-3 py-1 text-xs font-semibold text-white">İKİNCİ EL</span>;
}

export default function ProductDetailPanel({
  product,
  onClose,
  onCartOpen,
}: {
  product: Product;
  onClose: () => void;
  onCartOpen?: () => void;
}) {
  const { products, reviews, addToCart, toggleFavorite, favorites } = useStore();
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"details" | "reviews">("details");
  const [selectedGift, setSelectedGift] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const imgRef = useRef<HTMLDivElement>(null);
  const [lensPos, setLensPos] = useState({ x: 50, y: 50 });
  const [showLens, setShowLens] = useState(false);
  const [touchZoom, setTouchZoom] = useState(false);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setLensPos({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  };

  const isFavorite = favorites.includes(product.id);
  const availableGifts = product.gifts.filter((g) => g.stock > 0);

  const productReviews = reviews.filter(
    (r) => r.text.toLowerCase().includes(product.name.toLowerCase())
  );

  const relatedProducts = useMemo(
    () => products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 6),
    [products, product.category, product.id]
  );

  const handleAddToCart = () => {
    if (product.status === "out" || product.stock === 0) return;
    addToCart({ productId: product.id, quantity, giftId: selectedGift });
    onClose();
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

      <div id={"product-detail-" + product.id} className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-2.5">
          <div className="flex items-center gap-2">
            <ConditionBadge condition={product.condition} />
            <span className="text-xs text-stone-500">{product.category}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => toggleFavorite(product.id)} className="rounded-full border border-stone-300 p-1.5 text-stone-700 hover:bg-stone-100" aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill={isFavorite ? "#ef4444" : "none"} stroke={isFavorite ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            </button>
            <button onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Kapat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            ref={imgRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
            onMouseEnter={() => setShowLens(true)}
            onMouseLeave={() => setShowLens(false)}
            onTouchStart={() => setTouchZoom(true)}
            onTouchEnd={() => setTouchZoom(false)}
            className="group relative aspect-[5/3] flex-shrink-0 overflow-hidden bg-stone-100 cursor-none select-none"
          >
            {product.images.length > 0 ? (
              <>
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="h-full w-full object-cover pointer-events-none"
                />
                {showLens && !touchZoom && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div
                      className="h-full w-full"
                      style={{
                        transform: `scale(2.8)`,
                        transformOrigin: `${lensPos.x}% ${lensPos.y}%`,
                      }}
                    >
                      <img src={product.images[selectedImage]} alt="" className="h-full w-full object-cover" />
                    </div>
                  </div>
                )}
                {touchZoom && (
                  <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={() => setTouchZoom(false)}>
                    <div className="relative max-h-full max-w-full overflow-auto">
                      <img src={product.images[selectedImage]} alt={product.name} className="max-h-[90vh] w-auto object-contain" />
                      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/60">Kapatmak için tıkla</p>
                    </div>
                  </div>
                )}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage((selectedImage - 1 + product.images.length) % product.images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow transition hover:bg-white hover:scale-110"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <button
                      onClick={() => setSelectedImage((selectedImage + 1) % product.images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow transition hover:bg-white hover:scale-110"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                    <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {product.images.map((_, i) => (
                        <button key={i} onClick={() => setSelectedImage(i)} className={"h-1.5 rounded-full transition-all " + (i === selectedImage ? "w-4 bg-white shadow" : "w-1.5 bg-white/70")} />
                      ))}
                    </div>
                  </>
                )}
                {product.status === "out" || product.stock === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-bold text-white tracking-widest">STOKTA YOK</div>
                ) : null}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-stone-400">Görsel yok</div>
            )}
            {!showLens && !touchZoom && (
              <div className="absolute bottom-1.5 right-1.5 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white/70 pointer-events-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                Büyüt
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="font-elegant text-lg font-semibold text-stone-800">{product.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <Stars rating={5} size={14} />
                  <span className="text-xs text-stone-500">{productReviews.length} yorum</span>
                  <span className="text-xs text-stone-300">•</span>
                  <span className="text-xs text-stone-500">Stok: {product.stock}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                {product.hasDiscount && product.originalPriceNum && product.originalPriceNum > product.priceNum ? (
                  <>
                    <p className="text-xs text-stone-400 line-through">{product.originalPrice}</p>
                    <p className="font-elegant text-lg font-bold text-red-600">{product.price}</p>
                    <span className="inline-block mt-0.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">-%{product.discount || Math.round(((product.originalPriceNum - product.priceNum) / product.originalPriceNum) * 100)}</span>
                  </>
                ) : (
                  <p className="font-elegant text-lg font-bold text-stone-800">{product.price}</p>
                )}
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-stone-600">{product.description}</p>

            {availableGifts.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-stone-800">🎁 Hediye Seç</h4>
                <div className="mt-2 space-y-1.5">
                  {availableGifts.map((g) => (
                    <label key={g.id} className={`flex items-center justify-between rounded-xl border-2 p-2.5 transition cursor-pointer ${selectedGift === g.id ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-white hover:border-stone-400"}`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="gift" className="h-4 w-4 accent-emerald-600" checked={selectedGift === g.id} onChange={() => setSelectedGift(g.id)} />
                        <span className="text-sm font-medium text-stone-800">{g.title}</span>
                      </div>
                      <span className="text-xs text-stone-400">Stok: {g.stock}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 border-b border-stone-200">
              <div className="flex gap-5">
                <button onClick={() => setActiveTab("details")} className={"pb-2 text-sm font-medium transition " + (activeTab === "details" ? "border-b-2 border-stone-800 text-stone-800" : "text-stone-500")}>Detaylar</button>
                <button onClick={() => setActiveTab("reviews")} className={"pb-2 text-sm font-medium transition " + (activeTab === "reviews" ? "border-b-2 border-stone-800 text-stone-800" : "text-stone-500")}>Yorumlar ({productReviews.length})</button>
              </div>
            </div>

            <div className="mt-3">
              {activeTab === "details" && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5 text-sm">
                    <div className="rounded-lg bg-stone-50 p-3"><p className="text-xs text-stone-500">Kategori</p><p className="font-semibold text-stone-800">{product.category}</p></div>
                    <div className="rounded-lg bg-stone-50 p-3"><p className="text-xs text-stone-500">Durum</p><p className="font-semibold text-stone-800">{product.condition === "new" ? "Sıfır" : "İkinci El"}</p></div>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
                    <p className="font-semibold text-stone-800 mb-0.5">Bilgi:</p>
                    <p>Ürünlerimiz yayından sonra size özel Gardrops hesabımız üzerinden ilan açılmaktadır.</p>
                  </div>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="max-h-44 space-y-2.5 overflow-y-auto">
                  {productReviews.length > 0 ? (
                    productReviews.map((r) => (
                      <div key={r.id} className="rounded-lg border border-stone-200 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-stone-800">@{r.author}</span>
                            <Stars rating={r.rating} size={12} />
                          </div>
                          <span className="text-xs text-stone-400">{r.date}</span>
                        </div>
                        <p className="mt-1 text-sm text-stone-600">"{r.text}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-stone-500 text-center py-6">Henüz yorum yok.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div className="border-t border-stone-200 px-5 py-3">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-stone-500">Bunu alanlar bunu da aldı</h3>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                {relatedProducts.map((rp) => (
                  <div
                    key={rp.id}
                    onClick={() => {
                      const detail = document.getElementById("product-detail-" + rp.id);
                      if (detail) { detail.scrollIntoView({ behavior: "smooth" }); onClose(); }
                    }}
                    className="w-28 flex-shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-1.5 transition hover:shadow-md"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-md bg-stone-100">
                      {rp.images[0] ? <img src={rp.images[0]} alt={rp.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-[10px] text-stone-300">Görsel yok</div>}
                    </div>
                    <p className="mt-1 truncate text-[11px] font-medium text-stone-700">{rp.name}</p>
                    <p className="text-[11px] font-bold text-stone-900">{rp.priceNum.toLocaleString("tr-TR")} ₺</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Share */}
          <div className="flex items-center gap-2 border-t border-stone-200 px-5 py-2">
            <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">Paylaş</span>
            <a href={"https://api.whatsapp.com/send?text=" + encodeURIComponent(product.name + " - " + window.location.origin + "?product=" + product.id)} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition" title="WhatsApp">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            <a href={"https://twitter.com/intent/tweet?text=" + encodeURIComponent(product.name + " - " + window.location.origin)} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 transition" title="Twitter/X">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href={"https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(window.location.origin + "?product=" + product.id)} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition" title="Facebook">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
          <div className="flex-shrink-0 border-t border-stone-200 bg-white px-5 py-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-stone-700">Miktar</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm">−</button>
                <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm">+</button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {product.gardropsUrl && (
                <a
                  href={product.gardropsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-emerald-600 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Gardrops'ta Satın Al
                </a>
              )}
              <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                disabled={product.status === "out" || product.stock === 0}
                className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-stone-800 py-2.5 text-sm font-semibold text-white transition-all duration-500 hover:bg-[#d4a0a0] hover:shadow-[0_0_25px_6px_rgba(212,160,160,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-pink-500/0 via-pink-400/20 to-pink-500/0 transition-transform duration-500 group-hover:translate-x-full" />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
                <span className="relative z-10">Sepete Ekle</span>
              </button>
              <button
                onClick={() => { onClose(); onCartOpen?.(); }}
                className="flex items-center justify-center rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
              >
                Sepete Git
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
