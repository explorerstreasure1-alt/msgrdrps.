import { useState } from "react";
import { useStore, GARDROPS_DEFAULT } from "../lib/store";

export default function CartPanel({ onClose }: { onClose: () => void }) {
  const { cart, products, discounts, addToCart, removeFromCart, clearCart, currentUser, userCoupons, userGifts, useCoupon, claimGift, spendPoints, useFastShipping, addToast } = useStore();
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState("");
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [pointsToSpend, setPointsToSpend] = useState(0);
  const [claimingGiftId, setClaimingGiftId] = useState<string | null>(null);

  const totalQuantity = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((sum, item) => {
    const p = products.find((x) => x.id === item.productId);
    return sum + (p?.priceNum || 0) * item.quantity;
  }, 0);

  const autoApplicable = [...discounts]
    .filter((d) => d.active && totalQuantity >= d.minQuantity)
    .sort((a, b) => b.percentage - a.percentage)[0];

  const manualMatch = codeInput.trim()
    ? discounts.find((d) => d.active && d.code.toUpperCase() === codeInput.trim().toUpperCase() && totalQuantity >= d.minQuantity)
    : undefined;

  const effectiveCode = manualMatch || appliedCode
    ? discounts.find((d) => d.code === (manualMatch?.code || appliedCode))
    : autoApplicable;
  const discountPercent = effectiveCode?.percentage || 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);

  const selectedCoupon = selectedCouponId ? userCoupons.find((c) => c.id === selectedCouponId) : null;
  const couponDiscount = selectedCoupon ? Math.round((subtotal * selectedCoupon.discountPercent) / 100) : 0;

  const maxPoints = currentUser ? (currentUser.points || 0) : 0;
  const pointsDiscount = pointsToSpend * 1; // 1 point = 1 TL
  const maxDiscountablePoints = Math.min(maxPoints, subtotal - couponDiscount - discountAmount);

  const shipping = subtotal > 0 && subtotal < 500 ? 35 : 0;
  const total = Math.max(0, subtotal - discountAmount - couponDiscount - pointsDiscount + shipping);

  const myCoupons = userCoupons.filter((c) => c.userId === currentUser?.id && !c.used);
  const myGifts = userGifts.filter((g) => g.userId === currentUser?.id && !g.claimed);
  const hasFastShipping = currentUser?.fastShipping;

  const applyCode = () => {
    if (!codeInput.trim()) return;
    const code = codeInput.trim().toUpperCase();
    const d = discounts.find((x) => x.code.toUpperCase() === code);
    if (!d || !d.active) { setCodeError("Kod geçersiz veya aktif değil"); return; }
    if (totalQuantity < d.minQuantity) { setCodeError(`Bu kod için minimum ${d.minQuantity} ürün gerekli`); return; }
    setAppliedCode(d.code);
    setCodeInput("");
    setCodeError("");
    setSelectedCouponId(null);
  };

  const applyUserCoupon = (couponId: string) => {
    setSelectedCouponId(selectedCouponId === couponId ? null : couponId);
    setAppliedCode(null);
  };

  const handleClaimGift = (giftId: string) => {
    const gift = userGifts.find((g) => g.id === giftId);
    if (!gift) return;
    const existing = cart.find((i) => i.productId === gift.productId);
    if (existing) {
      addToCart({ productId: gift.productId, quantity: 1 });
    } else {
      addToCart({ productId: gift.productId, quantity: 1 });
    }
    setClaimingGiftId(giftId);
    claimGift(giftId, "pending");
    addToast(`${gift.productName} sepete eklendi!`, "success");
  };

  const handleCheckout = () => {
    if (!currentUser) return;
    if (selectedCouponId) useCoupon(selectedCouponId, "pending");
    if (pointsToSpend > 0) spendPoints(currentUser.id, pointsToSpend);
    if (hasFastShipping) useFastShipping(currentUser.id);
    addToast("Sipariş alındı! (Demo)", "success");
    clearCart();
    onClose();
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
      <div className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl sm:w-[28rem]">
        <div className="flex items-center justify-between border-b border-stone-200 p-4">
          <div>
            <h2 className="font-elegant text-xl font-semibold text-stone-800">Sepetiniz</h2>
            <p className="text-xs text-stone-400">{cart.length} ürün · {totalQuantity} adet</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="text-5xl">🛒</div>
              <p className="font-medium text-stone-600">Sepetiniz boş</p>
              <p className="text-xs text-stone-400">Hemen alışverişe başlayın</p>
              <button onClick={onClose} className="mt-2 rounded-full bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700">Ürünleri İncele</button>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {cart.map((item) => {
                const p = products.find((x) => x.id === item.productId);
                if (!p) return null;
                const gift = item.giftId ? p.gifts.find((g) => g.id === item.giftId) : null;
                const isFreeGift = myGifts.some((g) => g.productId === p.id);
                return (
                  <div key={item.productId} className="rounded-xl border border-stone-200 bg-white p-3">
                    <div className="flex gap-3">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-50">
                        {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-stone-800">{p.name}</h3>
                          <button onClick={() => removeFromCart(p.id)} className="text-stone-400 hover:text-red-600">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                          </button>
                        </div>
                        <p className="text-[11px] text-stone-400">{p.category}</p>
                        {isFreeGift && <span className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">🎁 HEDİYE</span>}
                        <div className="mt-1 flex items-center gap-2">
                          <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold text-white " + (p.condition === "new" ? "bg-emerald-600" : "bg-amber-600")}>{p.condition === "new" ? "SIFIR" : "İKİNCİ EL"}</span>
                        </div>
                        {gift && <p className="mt-1 text-[11px] text-emerald-700">🎁 {gift.title}</p>}
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { if (item.quantity === 1) removeFromCart(p.id); else addToCart({ productId: p.id, quantity: -1, giftId: item.giftId }); }} className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100">−</button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <button onClick={() => addToCart({ productId: p.id, quantity: 1 })} className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100">+</button>
                          </div>
                          <div className="text-right">
                            {isFreeGift ? (
                              <p className="text-sm font-bold text-rose-600">ÜCRETSİZ</p>
                            ) : p.hasDiscount && p.originalPrice ? (
                              <>
                                <p className="text-[11px] text-stone-400 line-through decoration-red-500">{p.originalPrice}</p>
                                <p className="text-sm font-bold text-red-600">₺{(p.priceNum * item.quantity).toLocaleString("tr-TR")}</p>
                              </>
                            ) : (
                              <p className="text-sm font-semibold text-stone-800">₺{(p.priceNum * item.quantity).toLocaleString("tr-TR")}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Çark kuponları */}
              {myCoupons.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-rose-50 p-3">
                  <h4 className="text-sm font-semibold text-amber-800">🎟️ Çark Kuponların</h4>
                  <div className="mt-2 space-y-1.5">
                    {myCoupons.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg bg-white/80 p-2 text-xs">
                        <div>
                          <span className="font-bold text-amber-800">{c.code}</span>
                          <span className="ml-2 text-stone-500">%{c.discountPercent} indirim</span>
                        </div>
                        <button
                          onClick={() => applyUserCoupon(c.id)}
                          className={"rounded-full px-3 py-1 text-[11px] font-medium " + (selectedCouponId === c.id ? "bg-stone-800 text-white" : "border border-stone-300 text-stone-600 hover:bg-stone-50")}
                        >
                          {selectedCouponId === c.id ? "✓ Seçili" : "Kullan"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hediye ürünler */}
              {myGifts.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <h4 className="text-sm font-semibold text-rose-800">🎁 Hediye Ürünlerin</h4>
                  <div className="mt-2 space-y-1.5">
                    {myGifts.map((g) => (
                      <div key={g.id} className="flex items-center justify-between rounded-lg bg-white/80 p-2 text-xs">
                        <span className="font-medium text-rose-700">{g.productName}</span>
                        <button
                          onClick={() => handleClaimGift(g.id)}
                          disabled={claimingGiftId === g.id}
                          className="rounded-full bg-rose-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {claimingGiftId === g.id ? "Eklendi" : "Sepete Ekle"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sadakat puanları */}
              {currentUser && maxPoints > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <h4 className="text-sm font-semibold text-emerald-800">⭐ Sadakat Puanların</h4>
                  <p className="mt-1 text-xs text-emerald-700">{maxPoints} puanın var (1 puan = 1 ₺)</p>
                  {subtotal > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        value={pointsToSpend}
                        onChange={(e) => setPointsToSpend(Math.min(Number(e.target.value) || 0, maxDiscountablePoints))}
                        min={0}
                        max={maxDiscountablePoints}
                        className="w-24 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                        placeholder="Puan"
                      />
                      <button
                        onClick={() => setPointsToSpend(maxDiscountablePoints)}
                        className="rounded-full border border-emerald-300 px-3 py-1.5 text-[11px] text-emerald-700 hover:bg-emerald-100"
                      >
                        Maks
                      </button>
                      {pointsToSpend > 0 && (
                        <span className="text-xs font-medium text-emerald-800">−₺{pointsToSpend}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Hızlı gönderim */}
              {hasFastShipping && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚀</span>
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Hızlı Gönderim Hakkın Var</p>
                      <p className="text-xs text-blue-600">Bu siparişin öncelikli işlenecek</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Discount code input */}
              <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-rose-50 p-3">
                <h4 className="text-sm font-semibold text-amber-800">💠 İndirim Kodu</h4>
                <div className="mt-2 flex gap-2">
                  <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyCode()} placeholder="MS3, MS5..." className="flex-1 rounded-full border border-stone-300 bg-white px-3 py-2 text-xs outline-none uppercase focus:border-stone-500" />
                  <button onClick={applyCode} className="rounded-full bg-stone-800 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700">Uygula</button>
                </div>
                {codeError && <p className="mt-2 text-[11px] text-red-600">{codeError}</p>}
                {appliedCode && <p className="mt-2 text-[11px] text-emerald-700">✓ {appliedCode} kodu uygulandı</p>}
                <div className="mt-3 space-y-1 text-[11px] text-stone-500">
                  {discounts.filter((d) => d.active).map((d) => (
                    <div key={d.id} className={"flex items-center justify-between rounded-lg bg-white/80 p-2 " + (totalQuantity >= d.minQuantity ? "border border-emerald-200" : "border border-stone-200 opacity-70")}>
                      <span><span className="font-bold">{d.code}</span> — {d.minQuantity}+ üründe %{d.percentage}</span>
                      {totalQuantity >= d.minQuantity ? <span className="text-emerald-700">✓</span> : <span className="text-stone-400">{d.minQuantity - totalQuantity} eksik</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="mt-3 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>Ara toplam</span>
                  <span className="font-medium">₺{subtotal.toLocaleString("tr-TR")}</span>
                </div>
                {selectedCoupon && (
                  <div className="flex items-center justify-between text-sm text-amber-700">
                    <span>Çark Kuponu ({selectedCoupon.code}) · %{selectedCoupon.discountPercent}</span>
                    <span>−₺{couponDiscount.toLocaleString("tr-TR")}</span>
                  </div>
                )}
                {(discountAmount > 0 || effectiveCode) && (
                  <div className="flex items-center justify-between text-sm text-emerald-700">
                    <span>İndirim ({effectiveCode?.code || "Otomatik"}) · %{discountPercent}</span>
                    <span>−₺{discountAmount.toLocaleString("tr-TR")}</span>
                  </div>
                )}
                {pointsToSpend > 0 && (
                  <div className="flex items-center justify-between text-sm text-emerald-700">
                    <span>Sadakat Puanı</span>
                    <span>−₺{pointsToSpend.toLocaleString("tr-TR")}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>Kargo</span>
                  <span>{shipping === 0 ? "Ücretsiz" : `₺${shipping}`}</span>
                </div>
                <div className="flex items-center justify-between border-t border-stone-300 pt-2 text-base font-bold text-stone-800">
                  <span>Toplam</span>
                  <span>₺{total.toLocaleString("tr-TR")}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">✅ 256-bit SSL ile güvenli</div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800">🚚 Aynı gün kargo</div>
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-800">💎 Premium kalite</div>
                <div className="rounded-lg border border-stone-200 bg-white p-2 text-stone-700">⭐ 5 yıldızlı yorumlar</div>
              </div>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-stone-200 p-4">
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCheckout}
                className="w-full rounded-full bg-stone-800 py-3 text-sm font-medium text-white hover:bg-stone-700"
              >
                Siparişi Tamamla
              </button>
              <button onClick={clearCart} className="rounded-full border border-stone-300 py-2 text-xs text-stone-600 hover:bg-stone-50">Sepeti Temizle</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
