import { useEffect, useRef, useState } from "react";
import {
  useStore,
  uid,
  type Product,
  type Review,
  type DiscountCode,
  type Message,
  type Auction,
} from "../lib/store";
import { Stars } from "./Stars";
import ImageDropzone from "./ImageDropzone";
import { AuctionDetailPanel } from "./AuctionDetailPanel";
import logoSrc from "../logo-admin.png";

const ADMIN_PASSWORD = "tanem123+";

/* -------- helpers for files/images -------- */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------------------- Login ---------------------- */
function Login({ onOk, onBack }: { onOk: () => void; onBack?: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f1e7] px-5">
      <div className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
        {onBack && (
          <button onClick={onBack} className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600" aria-label="Geri">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
        <div className="mb-6 flex justify-center">
          <img
            src={logoSrc}
            alt="MS"
            className="h-50 w-auto object-contain"
          />
        </div>
        <p className="text-center text-sm text-stone-500">Admin Girişi</p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") pw === ADMIN_PASSWORD ? onOk() : setErr(true);
          }}
          placeholder="Şifre"
          className="mt-4 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-stone-500"
        />
        {err && <p className="mt-2 text-xs text-red-600">Hatalı şifre.</p>}
        <button
          onClick={() => (pw === ADMIN_PASSWORD ? onOk() : setErr(true))}
          className="mt-4 w-full rounded-lg bg-stone-800 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
        >
          Giriş Yap
        </button>
        <p className="mt-4 text-center text-[11px] text-stone-400">Demo şifre: tanem123+</p>
      </div>
    </div>
  );
}

/* -------- empty product -------- */
function emptyProduct(gardrops: string): Product {
  return {
    id: uid(),
    name: "",
    price: "",
    priceNum: 0,
    originalPriceNum: 0,
    originalPrice: "",
    discount: 0,
    hasDiscount: false,
    category: "",
    description: "",
    images: [],
    gardropsUrl: gardrops,
    condition: "new",
    status: "active",
    stock: 1,
    gifts: [],
    shop: "msgrdrps",
  };
}

/* ---------------------- Products tab ---------------------- */
function ProductsTab() {
  const { products, addProduct, updateProduct, removeProduct, settings, addToast } =
    useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<Product[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [storeProgress, setStoreProgress] = useState({ current: 0, total: 0 });
  const storeAbortRef = useRef<() => void>(() => {});
  // batch edit
  const [batchMode, setBatchMode] = useState(false);
  const [batchIds, setBatchIds] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState("");
  const [batchValue, setBatchValue] = useState("");

  const handleScrape = async () => {
    if (!editing || !editing.gardropsUrl.includes("gardrops.com/")) return;
    setScraping(true);
    try {
      const res = await fetch("/api/scrape-gardrops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: editing.gardropsUrl }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setEditing({
          ...editing,
          name: d.name || editing.name,
          price: d.price || editing.price,
          priceNum: d.priceNum || editing.priceNum,
          description: d.description || editing.description,
          category: d.category || editing.category,
          condition: d.condition || editing.condition,
          images: d.images?.length ? d.images : editing.images,
        });
      } else {
        alert(json.error || "Ürün bilgileri alınamadı.");
      }
    } catch (err: unknown) {
      alert("Sunucuya bağlanılamadı: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setScraping(false);
    }
  };

  const startNew = () => {
    setEditing(emptyProduct(settings.gardropsUrl));
    setIsNew(true);
  };
  const startEdit = (p: Product) => {
    setEditing({ ...p });
    setIsNew(false);
  };
  const saveProduct = () => {
    if (!editing || !editing.name.trim()) return;
    const numVal = parseInt(String(editing.price).replace(/[^0-9]/g, ""), 10) || 0;
    const origNum = editing.originalPriceNum || 0;
    let discount = editing.discount || 0;
    let hasDiscount = Boolean(editing.hasDiscount) && origNum > numVal;
    if (hasDiscount && origNum > 0) {
      discount = Math.round(((origNum - numVal) / origNum) * 100);
    }
    const toSave: Product = {
      ...editing,
      priceNum: numVal,
      price: editing.price.startsWith("₺") ? editing.price : `₺${numVal}`,
      originalPrice: `₺${origNum}`,
      originalPriceNum: origNum,
      discount,
      hasDiscount,
      status: editing.stock <= 0 ? "out" : editing.status,
    };
    isNew ? addProduct(toSave) : updateProduct(toSave);
    setEditing(null);
  };

  const addGift = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      gifts: [...editing.gifts, { id: uid(), title: "Yeni hediye", stock: 1 }],
    });
  };
  const updateGift = (gid: string, patch: Partial<{ title: string; stock: number; image: string }>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      gifts: editing.gifts.map((g) =>
        g.id === gid ? { ...g, ...patch } : g
      ),
    });
  };
  const removeGift = (gid: string) => {
    if (!editing) return;
    setEditing({ ...editing, gifts: editing.gifts.filter((g) => g.id !== gid) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-elegant text-xl text-stone-800">
          Ürünler ({products.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setBatchMode(!batchMode); setBatchIds(new Set()); }}
            className={"rounded-full border px-3 py-1.5 text-xs font-medium transition " + (batchMode ? "bg-amber-100 border-amber-400 text-amber-800" : "border-stone-300 text-stone-600 hover:bg-stone-50")}
          >
            {batchMode ? "Toplu Düzenleme (Aktif)" : "Toplu Düzenleme"}
          </button>
          <button
            onClick={startNew}
            className="rounded-full bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            + Yeni Ürün
          </button>
        </div>
      </div>

      {/* Batch action bar */}
      {batchMode && batchIds.size > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-semibold text-amber-800">{batchIds.size} ürün seçildi</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={batchAction}
              onChange={(e) => setBatchAction(e.target.value)}
              className="inp max-w-40 text-xs"
            >
              <option value="">İşlem seçin</option>
              <option value="category">Kategori değiştir</option>
              <option value="condition">Durum değiştir (Sıfır/İkinci El)</option>
              <option value="shop">Mağaza değiştir</option>
              <option value="status">Stok durumu değiştir</option>
              <option value="delete">Seçilenleri sil</option>
            </select>
            {batchAction === "category" && (
              <input value={batchValue} onChange={(e) => setBatchValue(e.target.value)} placeholder="Yeni kategori" className="inp max-w-32 text-xs" />
            )}
            {batchAction === "condition" && (
              <select value={batchValue} onChange={(e) => setBatchValue(e.target.value)} className="inp max-w-32 text-xs">
                <option value="new">Sıfır</option>
                <option value="second">İkinci El</option>
              </select>
            )}
            {batchAction === "shop" && (
              <select value={batchValue} onChange={(e) => setBatchValue(e.target.value)} className="inp max-w-32 text-xs">
                {(settings.shops || [{ name: "msgrdrps", url: "" }]).map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            )}
            {batchAction === "status" && (
              <select value={batchValue} onChange={(e) => setBatchValue(e.target.value)} className="inp max-w-32 text-xs">
                <option value="active">Aktif</option>
                <option value="out">Stokta Yok</option>
              </select>
            )}
            <button
              onClick={() => {
                if (batchAction === "delete") {
                  if (!confirm(`${batchIds.size} ürün silinecek. Emin misiniz?`)) return;
                  batchIds.forEach((id) => removeProduct(id));
                  addToast(`${batchIds.size} ürün silindi`, "info");
                } else if (batchValue) {
                  const patch: Partial<Product> = {};
                  if (batchAction === "category") patch.category = batchValue;
                  if (batchAction === "condition") patch.condition = batchValue as "new" | "second";
                  if (batchAction === "shop") patch.shop = batchValue;
                  if (batchAction === "status") patch.status = batchValue as "active" | "out";
                  products.filter((p) => batchIds.has(p.id)).forEach((p) => updateProduct({ ...p, ...patch }));
                  addToast(`${batchIds.size} ürün güncellendi`, "success");
                }
                setBatchIds(new Set());
                setBatchAction("");
                setBatchValue("");
              }}
              disabled={!batchAction || (batchAction !== "delete" && !batchValue)}
              className="rounded-lg bg-stone-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              Uygula
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="rounded-2xl border border-stone-300 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-medium text-stone-800">
            {isNew ? "Yeni Ürün Ekle" : "Ürünü Düzenle"}
          </h3>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Ürün Adı">
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="inp"
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Fiyat (sayı)">
                  <input
                    type="number"
                    value={editing.priceNum}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        priceNum: Number(e.target.value) || 0,
                        price: `₺${Number(e.target.value) || 0}`,
                      })
                    }
                    className="inp"
                  />
                </Field>
                <Field label="Stok">
                  <input
                    type="number"
                    value={editing.stock}
                    onChange={(e) =>
                      setEditing({ ...editing, stock: Number(e.target.value) || 0 })
                    }
                    className="inp"
                  />
                </Field>
                <Field label="Kategori">
                  <input
                    value={editing.category}
                    onChange={(e) =>
                      setEditing({ ...editing, category: e.target.value })
                    }
                    className="inp"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Durum">
                  <select
                    value={editing.condition}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        condition: e.target.value as "new" | "second",
                      })
                    }
                    className="inp"
                  >
                    <option value="new">Sıfır</option>
                    <option value="second">İkinci El</option>
                  </select>
                </Field>
                <Field label="Stok Durumu">
                  <select
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        status: e.target.value as "active" | "out",
                      })
                    }
                    className="inp"
                  >
                    <option value="active">Aktif</option>
                    <option value="out">Stokta Yok</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mağaza">
                  <select
                    value={editing.shop || "msgrdrps"}
                    onChange={(e) => setEditing({ ...editing, shop: e.target.value })}
                    className="inp"
                  >
                    {(settings.shops || [{ name: "msgrdrps", url: "" }]).map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Açıklama">
                <textarea
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  rows={3}
                  className="inp resize-none"
                />
              </Field>

              {/* Indirim bölümü */}
              <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-rose-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-800">
                    🎈 Ürüne Özel İndirim Uygula
                  </span>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!editing.hasDiscount}
                      onChange={(e) =>
                        setEditing({ ...editing, hasDiscount: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    İndirim aktif
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Eski Fiyat (üstü çizili gösterilecek)">
                    <input
                      type="number"
                      value={editing.originalPriceNum || 0}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          originalPriceNum: Number(e.target.value) || 0,
                          originalPrice: `₺${Number(e.target.value) || 0}`,
                        })
                      }
                      className="inp"
                    />
                  </Field>
                  <Field label="İndirim Oranı (%) (otomatik de hesaplanır)">
                    <input
                      type="number"
                      value={editing.discount || 0}
                      onChange={(e) =>
                        setEditing({ ...editing, discount: Number(e.target.value) || 0 })
                      }
                      className="inp"
                    />
                  </Field>
                </div>
                {editing.hasDiscount && editing.originalPriceNum && editing.originalPriceNum > editing.priceNum && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg bg-white/80 p-3 text-sm">
                    <span className="text-xs text-stone-500">
                      <span className="line-through decoration-red-500">
                        ₺{editing.originalPriceNum}
                      </span>{" "}
                      → <span className="font-bold text-red-600">₺{editing.priceNum}</span>
                    </span>
                    <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                      %{Math.round(((editing.originalPriceNum - editing.priceNum) / editing.originalPriceNum) * 100)} İNDİRİM
                    </span>
                  </div>
                )}
              </div>

              <Field label="Gardrops Linki">
                <div className="flex gap-2">
                  <input
                    value={editing.gardropsUrl}
                    onChange={(e) =>
                      setEditing({ ...editing, gardropsUrl: e.target.value })
                    }
                    className="inp flex-1"
                    placeholder="https://www.gardrops.com/..."
                  />
                  <button
                    onClick={handleScrape}
                    disabled={scraping || !editing.gardropsUrl.includes("gardrops.com/")}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {scraping ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Çekiliyor...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                        Ürün Bilgilerini Getir
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-stone-400">Gardrops ürün linkini yapıştırın, bilgiler otomatik dolsun.</p>
              </Field>

              {/* Gifts */}
              <div>
                <div className="flex items-center justify-between">
                  <Field label="🎁 Ürüne Özel Hediyeler">
                    <div className="mt-1 text-[11px] font-normal text-stone-400">
                      Hediye stoğu sıfırlanırsa "Hediye stoğu yoktur" uyarısı gösterilir.
                    </div>
                  </Field>
                  <button
                    onClick={addGift}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                  >
                    + Hediye Ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {editing.gifts.length === 0 ? (
                    <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-500">
                      Henüz hediye tanımlı değil. İsterseniz yukarıdan ekleyin.
                    </p>
                  ) : (
                    editing.gifts.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2"
                      >
                        <input
                          value={g.title}
                          onChange={(e) => updateGift(g.id, { title: e.target.value })}
                          placeholder="Hediye adı"
                          className="inp flex-1"
                        />
                        <input
                          type="number"
                          value={g.stock}
                          onChange={(e) =>
                            updateGift(g.id, { stock: Number(e.target.value) || 0 })
                          }
                          className="inp w-20"
                          placeholder="Stok"
                        />
                        <button
                          onClick={() => removeGift(g.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Sil
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <Field label="Fotoğraflar (sürükle-bırak / çoklu / URL)">
              <ImageDropzone
                images={editing.images}
                onChange={(imgs) => setEditing({ ...editing, images: imgs })}
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveProduct}
              className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Kaydet
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border border-stone-300 px-5 py-2 text-sm text-stone-600 hover:bg-stone-100"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div
            key={p.id}
            className={"flex gap-3 rounded-xl border bg-white p-3 " + (batchMode && batchIds.has(p.id) ? "border-amber-400 ring-2 ring-amber-200" : "border-stone-200")}
          >
            {batchMode && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={batchIds.has(p.id)}
                  onChange={() => {
                    const next = new Set(batchIds);
                    next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                    setBatchIds(next);
                  }}
                  className="h-4 w-4 accent-amber-600"
                />
              </div>
            )}
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
              {p.images[0] && (
                <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
              )}
            </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-stone-800">{p.name}</p>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold text-white " +
                        (p.condition === "new" ? "bg-emerald-600" : "bg-amber-600")
                      }
                    >
                      {p.condition === "new" ? "SIFIR" : "İKİNCİ EL"}
                    </span>
                    {p.hasDiscount && p.originalPriceNum && p.originalPriceNum > p.priceNum && (
                      <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        %{p.discount || Math.round(((p.originalPriceNum - p.priceNum) / p.originalPriceNum) * 100)} İNDİRİM
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-stone-400">
                  {p.category} · Stok: {p.stock} · Hediye: {p.gifts.length}
                </p>
                <div className="flex flex-col">
                  {p.hasDiscount && p.originalPrice ? (
                    <>
                      <span className="text-[11px] text-stone-400 line-through decoration-red-500">
                        {p.originalPrice}
                      </span>
                      <span className="text-sm font-bold text-red-600">{p.price}</span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-stone-700">{p.price}</span>
                  )}
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  <button
                    onClick={() => startEdit(p)}
                    className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => removeProduct(p.id)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
          </div>
        ))}
      </div>

      {/* Store Import */}
      <div className="mt-8 border-t border-stone-200 pt-6">
        <button
          onClick={() => setStoreOpen(!storeOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-900"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
          {storeOpen ? "▼  Mağazadan İçe Aktar" : "▶  Mağazadan İçe Aktar"}
        </button>

        {storeOpen && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="gardrops.com/msgrdrps"
                className="inp flex-1"
              />
              <button
                onClick={async () => {
                  if (!importUrl.includes("gardrops.com/")) return;
                  setImporting(true);
                  setImported([]);
                  setSelectedImportIds(new Set());
                  setStoreProgress({ current: 0, total: 0 });
                  const ab = new AbortController();
                  storeAbortRef.current = () => ab.abort();
                  try {
                    const res = await fetch("/api/scrape-gardrops-store", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: importUrl }),
                      signal: ab.signal,
                    });
                    if (!res.ok) { alert("Sunucu hatası"); return; }
                    const reader = res.body!.getReader();
                    const decoder = new TextDecoder();
                    let buf = "";
                    let currentEvent = "";
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      buf += decoder.decode(value, { stream: true });
                      const parts = buf.split("\n\n");
                      buf = parts.pop() || "";
                      for (const part of parts) {
                        if (!part) continue;
                        const lines = part.split("\n");
                        let dataLine = "";
                        for (const line of lines) {
                          if (line.startsWith("event: ")) currentEvent = line.slice(7);
                          else if (line.startsWith("data: ")) dataLine = line.slice(6);
                        }
                        if (!dataLine) continue;
                        try {
                          const ev = JSON.parse(dataLine);
                          if (currentEvent === "product") {
                            const d = ev.product;
                            const pid = uid();
                            setImported((prev) => [
                              ...prev,
                              {
                                id: pid,
                                name: d.name || "",
                                price: d.price || "",
                                priceNum: d.priceNum || 0,
                                originalPriceNum: d.originalPriceNum || 0,
                                originalPrice: d.originalPrice || "",
                                discount: d.discount || 0,
                                hasDiscount: d.hasDiscount || false,
                                category: d.category || "",
                                description: d.description || "",
                                images: d.images || [],
                                gardropsUrl: d.gardropsUrl || "",
                                condition: d.condition || "new",
                                status: "active" as const,
                                stock: 1,
                                gifts: [],
                                shop: settings.shops?.[0]?.name || "msgrdrps",
                              },
                            ]);
                            setSelectedImportIds((prev) => {
                              const next = new Set(prev);
                              next.add(pid);
                              return next;
                            });
                            setStoreProgress({ current: ev.index + 1, total: ev.total });
                          } else if (currentEvent === "done") {
                            setStoreProgress((p) => ({ ...p, current: p.total }));
                          } else if (currentEvent === "error") {
                            alert(ev.error);
                          }
                        } catch {}
                      }
                    }
                  } catch (err: unknown) {
                    if ((err as any)?.name === "AbortError") return;
                    alert("Hata: " + (err instanceof Error ? err.message : String(err)));
                  } finally {
                    setImporting(false);
                    setStoreProgress({ current: 0, total: 0 });
                  }
                }}
                disabled={importing || !importUrl.includes("gardrops.com/")}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
              >
                {importing ? `Çekiliyor... ${storeProgress.current}/${storeProgress.total}` : "Ürünleri Getir"}
              </button>
              {importing && (
                <button
                  onClick={() => { storeAbortRef.current(); }}
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 whitespace-nowrap"
                >
                  Durdur
                </button>
              )}
            </div>

            {imported.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-emerald-800">
                    {imported.length} ürün bulundu
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const checked = imported.filter((p) => selectedImportIds.has(p.id));
                        checked.forEach((p) => addProduct(p));
                        addToast(`${checked.length} ürün içe aktarıldı`, "success");
                        setImported([]);
                        setSelectedImportIds(new Set());
                      }}
                      className="rounded-lg bg-stone-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                    >
                      Seçilenleri Yayınla ({selectedImportIds.size})
                    </button>
                  </div>
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {imported.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 cursor-pointer hover:border-emerald-300"
                    >
                      <input
                        type="checkbox"
                        checked={selectedImportIds.has(p.id)}
                        onChange={() => {
                          const next = new Set(selectedImportIds);
                          next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                          setSelectedImportIds(next);
                        }}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                        {p.images[0] && (
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-800">{p.name}</p>
                        <p className="text-xs text-stone-400">{p.price} · {p.category}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------- Reviews -------- */
function ReviewsTab() {
  const { reviews, addReview, updateReview, removeReview } = useStore();
  const [editing, setEditing] = useState<Review | null>(null);
  const [isNew, setIsNew] = useState(false);

  const startNew = () => {
    setEditing({ id: uid(), author: "", rating: 5, text: "", date: "şimdi" });
    setIsNew(true);
  };

  const save = () => {
    if (!editing || !editing.author.trim() || !editing.text.trim()) return;
    isNew ? addReview(editing) : updateReview(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-elegant text-xl text-stone-800">
          Gardrops Yorumları ({reviews.length})
        </h2>
        <button
          onClick={startNew}
          className="rounded-full bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Yorum Yaz
        </button>
      </div>

      {editing && (
        <div className="space-y-3 rounded-2xl border border-stone-300 bg-white p-5">
          <h3 className="font-medium text-stone-800">
            {isNew ? "Yeni Yorum" : "Yorumu Düzenle"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kullanıcı Adı">
              <input
                value={editing.author}
                onChange={(e) => setEditing({ ...editing, author: e.target.value })}
                placeholder="kullanici_adi"
                className="inp"
              />
            </Field>
            <Field label="Tarih">
              <input
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                placeholder="örn: 2 hafta önce"
                className="inp"
              />
            </Field>
          </div>
          <Field label="Puan">
            <Stars
              rating={editing.rating}
              size={22}
              onChange={(n) => setEditing({ ...editing, rating: n })}
            />
          </Field>
          <Field label="Yorum">
            <textarea
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              rows={3}
              className="inp resize-none"
            />
          </Field>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Kaydet
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border border-stone-300 px-5 py-2 text-sm text-stone-600 hover:bg-stone-100"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-800">
                @{r.author}
              </span>
              <Stars rating={r.rating} />
            </div>
            <p className="mt-2 text-sm text-stone-600">"{r.text}"</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-stone-400">{r.date}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing({ ...r });
                    setIsNew(false);
                  }}
                  className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => removeReview(r.id)}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------- Discounts -------- */
function DiscountsTab() {
  const { discounts, addDiscount, updateDiscount, removeDiscount } = useStore();
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [isNew, setIsNew] = useState(false);

  const startNew = () => {
    setEditing({
      id: uid(),
      code: "MS",
      minQuantity: 2,
      percentage: 5,
      description: "",
      active: true,
    });
    setIsNew(true);
  };
  const save = () => {
    if (!editing) return;
    const withDesc: DiscountCode = {
      ...editing,
      description:
        editing.description ||
        `${editing.minQuantity}+ ürünlerde %${editing.percentage} indirim`,
    };
    isNew ? addDiscount(withDesc) : updateDiscount(withDesc);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-elegant text-xl text-stone-800">
          Çoklu Ürün İndirim Kodları
        </h2>
        <button
          onClick={startNew}
          className="rounded-full bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Yeni İndirim
        </button>
      </div>

      {editing && (
        <div className="space-y-3 rounded-2xl border border-stone-300 bg-white p-5">
          <h3 className="font-medium text-stone-800">
            {isNew ? "Yeni İndirim" : "İndirimi Düzenle"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Kod">
              <input
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                className="inp"
              />
            </Field>
            <Field label="Min. Ürün">
              <input
                type="number"
                value={editing.minQuantity}
                onChange={(e) =>
                  setEditing({ ...editing, minQuantity: Number(e.target.value) || 0 })
                }
                className="inp"
              />
            </Field>
            <Field label="Oran (%)">
              <input
                type="number"
                value={editing.percentage}
                onChange={(e) =>
                  setEditing({ ...editing, percentage: Number(e.target.value) || 0 })
                }
                className="inp"
              />
            </Field>
            <Field label="Durum">
              <select
                value={editing.active ? "1" : "0"}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.value === "1" })
                }
                className="inp"
              >
                <option value="1">Aktif</option>
                <option value="0">Pasif</option>
              </select>
            </Field>
          </div>
          <Field label="Açıklama">
            <input
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="İsteğe bağlı"
              className="inp"
            />
          </Field>
          <div className="flex gap-2">
            <button onClick={save} className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700">
              Kaydet
            </button>
            <button onClick={() => setEditing(null)} className="rounded-lg border border-stone-300 px-5 py-2 text-sm text-stone-600 hover:bg-stone-100">
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {discounts.map((d) => (
          <div key={d.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-elegant text-lg font-semibold text-stone-800">
                {d.code}
              </span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                  (d.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-500")
                }
              >
                {d.active ? "AKTİF" : "PASİF"}
              </span>
            </div>
            <p className="text-xs text-stone-500">{d.description}</p>
            <div className="mt-2 text-sm text-stone-700">
              Min {d.minQuantity} ürün · %{d.percentage} indirim
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setEditing({ ...d });
                  setIsNew(false);
                }}
                className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
              >
                Düzenle
              </button>
              <button
                onClick={() => removeDiscount(d.id)}
                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------- Messages -------- */
function MessageBubble({ msg }: { msg: Message }) {
  const isAdmin = msg.sender === "admin";
  const isSystem = msg.sender === "system";
  return (
    <div className={"flex " + (isAdmin ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] space-y-1 rounded-2xl px-3 py-2 text-sm " +
          (isAdmin
            ? "rounded-br-sm bg-stone-800 text-white"
            : isSystem
            ? "rounded-bl-sm border border-amber-200 bg-amber-50 text-stone-700"
            : "rounded-bl-sm bg-white text-stone-800 shadow-sm")
        }
      >
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="space-y-1">
            {msg.attachments.map((a, i) => (
              <div key={i}>
                {a.type === "image" ? (
                  <a href={a.url} target="_blank" rel="noreferrer">
                    <img
                      src={a.url}
                      alt=""
                      className="max-h-40 max-w-full rounded-lg object-contain"
                    />
                  </a>
                ) : (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className={
                      "underline " + (isAdmin ? "text-stone-100" : "text-amber-800")
                    }
                  >
                    {a.type === "link" ? "🔗 " : "📎 "}
                    {a.label || a.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        {msg.text && (
          <span className="whitespace-pre-wrap break-words">{msg.text}</span>
        )}
      </div>
    </div>
  );
}

function MessagesTab() {
  const { conversations, sendMessage, markRead, toggleBlock, setSeen } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const sorted = [...conversations].sort((a, b) => b.lastActive - a.lastActive);
  const active = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    if (active) markRead(active.id);
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.id, active?.messages.length, markRead]);

  const send = (text: string, attachments?: Message["attachments"]) => {
    if (!active || (!text.trim() && (!attachments || attachments.length === 0))) return;
    sendMessage(active.id, "admin", text.trim(), active.name, attachments);
  };

  const handleSend = () => {
    send(input);
    setInput("");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !active) return;
    const arr = Array.from(files);
    const att: Message["attachments"] = [];
    for (const f of arr) {
      const url = await fileToDataUrl(f);
      att.push({
        type: f.type.startsWith("image/") ? "image" : "file",
        url,
        label: f.name,
      });
    }
    send("", att);
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    const url = linkInput.trim().startsWith("http")
      ? linkInput.trim()
      : "https://" + linkInput.trim();
    send("", [{ type: "link", url, label: linkInput.trim() }]);
    setLinkInput("");
  };

  return (
    <div className="grid h-[40rem] grid-cols-1 gap-4 sm:grid-cols-[16rem_1fr]">
      {/* List */}
      <div className="overflow-y-auto rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-4 py-3 text-sm font-medium text-stone-700">
          Sohbetler ({conversations.length})
        </div>
        {sorted.length === 0 && (
          <p className="p-4 text-sm text-stone-400">Henüz mesaj yok.</p>
        )}
        {sorted.map((c) => (
          <div
            key={c.id}
            className={
              "flex items-center gap-3 border-b border-stone-50 px-4 py-3 transition " +
              (activeId === c.id ? "bg-[#f3ebdd]" : "hover:bg-stone-50")
            }
          >
            <button
              onClick={() => setActiveId(c.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#efe5d4] text-sm font-semibold text-stone-700">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-sm font-medium text-stone-800">
                    {c.name}
                  </p>
                  {c.blocked && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                      ENGEL
                    </span>
                  )}
                  {!c.seenByAdmin && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                      GÖRÜLMEDİ
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-stone-400">
                  {c.messages[c.messages.length - 1]?.text.slice(0, 28)}
                </p>
              </div>
            </button>
            {c.unreadByAdmin > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] text-white">
                {c.unreadByAdmin}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Chat */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fdfaf4]">
        {active ? (
          <>
            <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-stone-800">{active.name}</p>
                <p className="text-xs text-stone-400">ID: {active.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSeen(active.id, !active.seenByAdmin)}
                  className={
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition " +
                    (active.seenByAdmin
                      ? "border-stone-300 text-stone-500 hover:bg-stone-100"
                      : "border-amber-300 text-amber-700")
                  }
                >
                  {active.seenByAdmin ? "Görüldü" : "Görünmedi"}
                </button>
                <button
                  onClick={() => toggleBlock(active.id)}
                  className={
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition " +
                    (active.blocked
                      ? "border-red-300 text-red-700"
                      : "border-stone-300 text-stone-600 hover:bg-stone-100")
                  }
                >
                  {active.blocked ? "Engeli Kaldır" : "Müşteriyi Engelle"}
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((m) => (
                <MessageBubble key={m.id} msg={m} />
              ))}
              <div ref={endRef} />
            </div>

            {/* Attachment bar */}
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 bg-white px-3 py-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              >
                📎 Dosya
              </button>
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.accept = "image/*";
                    fileRef.current.click();
                  }
                }}
                className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              >
                📸 Görsel
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                placeholder="Link yapıştır"
                className="flex-1 min-w-[10rem] rounded-full border border-stone-300 px-3 py-1.5 text-xs outline-none focus:border-stone-500"
              />
              <button
                onClick={handleAddLink}
                className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              >
                🔗 Link Ekle
              </button>
            </div>

            <div className="flex items-center gap-2 border-t border-stone-200 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Mesaj yazın..."
                className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm outline-none focus:border-stone-500"
                disabled={active.blocked}
              />
              <button
                onClick={handleSend}
                disabled={active.blocked}
                className="rounded-full bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-stone-400">
            Bir sohbet seçin
          </div>
        )}
      </div>
    </div>
  );
}

/* -------- Stats -------- */
function StatsTab() {
  const { products, orders, spinPrizes } = useStore();

  const totalProducts = products.length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

  const catMap = new Map<string, number>();
  for (const p of products) {
    const key = p.category || "Diğer";
    catMap.set(key, (catMap.get(key) || 0) + 1);
  }
  const catEntries = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries.length > 0 ? Math.max(...catEntries.map(([, v]) => v)) : 1;

  const statusMap = new Map<string, number>();
  for (const o of orders) {
    const key = o.status || "pending";
    statusMap.set(key, (statusMap.get(key) || 0) + 1);
  }
  const statusLabels: Record<string, string> = { pending: "Bekleyen", paid: "Ödendi", shipped: "Kargoda", delivered: "Teslim Edildi" };

  const cardClass = "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm";

  return (
    <div className="space-y-6">
      <h2 className="font-elegant text-xl text-stone-800">İstatistikler</h2>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wider text-stone-400">Toplam Ürün</p>
          <p className="mt-1 text-3xl font-bold text-stone-800">{totalProducts}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wider text-stone-400">Toplam Sipariş</p>
          <p className="mt-1 text-3xl font-bold text-stone-800">{totalOrders}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wider text-stone-400">Toplam Gelir</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{totalRevenue.toLocaleString("tr-TR")} ₺</p>
        </div>
      </div>

      {/* Category distribution */}
      <div className={cardClass}>
        <h3 className="mb-4 text-sm font-semibold text-stone-700">Kategorilere Göre Ürün Dağılımı</h3>
        <div className="space-y-2.5">
          {catEntries.map(([cat, count]) => (
            <div key={cat}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">{cat}</span>
                <span className="text-stone-500">{count} ürün</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#d4a0a0] to-rose-400 transition-all"
                  style={{ width: `${(count / maxCat) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {catEntries.length === 0 && <p className="text-xs text-stone-400">Henüz ürün yok.</p>}
        </div>
      </div>

      {/* Order status breakdown */}
      {totalOrders > 0 && (
        <div className={cardClass}>
          <h3 className="mb-4 text-sm font-semibold text-stone-700">Sipariş Durumları</h3>
          <div className="flex gap-4">
            {Array.from(statusMap.entries()).map(([key, count]) => (
              <div key={key} className="flex-1 rounded-xl border border-stone-200 p-4 text-center">
                <p className="text-2xl font-bold text-stone-800">{count}</p>
                <p className="text-xs text-stone-500">{statusLabels[key] || key}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spin prizes */}
      {spinPrizes.length > 0 && (
        <div className={cardClass}>
          <h3 className="mb-4 text-sm font-semibold text-stone-700">Çark Ödülleri</h3>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {spinPrizes.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-2 text-xs">
                <span className={"font-medium " + (p.prize === "gift" ? "text-rose-700" : "text-amber-700")}>
                  {p.prize === "gift" ? "🎁 Hediye" : `${p.label} İndirim`}
                </span>
                <span className="text-stone-400">{new Date(p.date).toLocaleString("tr-TR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- Settings -------- */
function SettingsTab() {
  const { settings, updateSettings, addProduct, addToast } = useStore();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncNow = async () => {
    setSyncing(true);
    let imported = 0;
    try {
      const res = await fetch("/api/scrape-gardrops-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: draft.gardropsUrl }),
      });
      if (!res.ok) { alert("Sync hatası"); return; }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let currentEvent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          if (!part) continue;
          const lines = part.split("\n");
          let dataLine = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) currentEvent = line.slice(7);
            else if (line.startsWith("data: ")) dataLine = line.slice(6);
          }
          if (!dataLine) continue;
          try {
            const ev = JSON.parse(dataLine);
            if (currentEvent === "product") {
              const d = ev.product;
              const pid = Math.random().toString(36).slice(2, 10);
              addProduct({
                id: pid,
                name: d.name || "",
                price: d.price || "",
                priceNum: d.priceNum || 0,
                originalPriceNum: d.originalPriceNum || 0,
                originalPrice: d.originalPrice || "",
                discount: d.discount || 0,
                hasDiscount: d.hasDiscount || false,
                category: d.category || "",
                description: d.description || "",
                images: d.images || [],
                gardropsUrl: d.gardropsUrl || "",
                condition: d.condition || "new",
                status: "active" as const,
                stock: 1,
                gifts: [],
                shop: settings.shops?.[0]?.name || "msgrdrps",
              });
              imported++;
            } else if (currentEvent === "done") {
              const updated = { ...draft, lastSyncTimestamp: Date.now() };
              setDraft(updated);
              updateSettings(updated);
            } else if (currentEvent === "error") {
              alert(ev.error);
            }
          } catch {}
        }
      }
      if (imported > 0) addToast(`${imported} ürün senkronize edildi`, "success");
    } catch (err: unknown) {
      alert("Sync hatası: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="font-elegant text-xl text-stone-800">Ayarlar</h2>
      <Field label="Gardrops Mağaza Linki">
        <input
          value={draft.gardropsUrl}
          onChange={(e) => setDraft({ ...draft, gardropsUrl: e.target.value })}
          className="inp"
        />
      </Field>
      <Field label="Otomatik Karşılama Mesajı">
        <textarea
          value={draft.autoWelcome}
          onChange={(e) => setDraft({ ...draft, autoWelcome: e.target.value })}
          rows={8}
          className="inp resize-none"
        />
      </Field>

      {/* Auto Sync */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-stone-700">Otomatik Gardrops Senkronizasyonu</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={draft.autoSync}
              onChange={(e) => setDraft({ ...draft, autoSync: e.target.checked })}
              className="h-4 w-4 accent-stone-800"
            />
            <span className="text-sm text-stone-700">Otomatik senkronizasyonu etkinleştir</span>
          </label>
          {draft.autoSync && (
            <div>
              <label className="mb-1.5 block text-xs text-stone-500">Senkronizasyon Aralığı</label>
              <select
                value={draft.syncIntervalMs}
                onChange={(e) => setDraft({ ...draft, syncIntervalMs: Number(e.target.value) })}
                className="inp max-w-xs"
              >
                <option value={3600000}>Her saat</option>
                <option value={21600000}>Her 6 saat</option>
                <option value={43200000}>Her 12 saat</option>
                <option value={86400000}>Her gün</option>
              </select>
            </div>
          )}
          {draft.lastSyncTimestamp > 0 && (
            <p className="text-xs text-stone-400">
              Son senkronizasyon: {new Date(draft.lastSyncTimestamp).toLocaleString("tr-TR")}
            </p>
          )}
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {syncing ? "Senkronize ediliyor..." : "Şimdi Senkronize Et"}
          </button>
        </div>
      </div>

      {/* Stores */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-stone-700">Mağazalar</h3>
        <div className="space-y-2">
          {(draft.shops || []).map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={s.name}
                onChange={(e) => {
                  const next = [...(draft.shops || [])];
                  next[i] = { ...next[i], name: e.target.value };
                  setDraft({ ...draft, shops: next });
                }}
                placeholder="Mağaza adı"
                className="inp w-36"
              />
              <input
                value={s.url}
                onChange={(e) => {
                  const next = [...(draft.shops || [])];
                  next[i] = { ...next[i], url: e.target.value };
                  setDraft({ ...draft, shops: next });
                }}
                placeholder="gardrops.com/magaza"
                className="inp flex-1"
              />
              {i > 0 && (
                <button
                  onClick={() => {
                    const next = draft.shops.filter((_, j) => j !== i);
                    setDraft({ ...draft, shops: next });
                  }}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Sil
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setDraft({ ...draft, shops: [...(draft.shops || []), { name: "", url: "" }] })}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
          >
            + Mağaza Ekle
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            updateSettings(draft);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          {saved ? "Kaydedildi ✓" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

/* -------- Auctions -------- */
function AuctionsTab() {
  const { products, auctions, bids, createAuction, acceptBid, rejectBid, cancelAuction, getAuctionBids, addToast } = useStore();
  const [draftProductId, setDraftProductId] = useState("");
  const [draftPrice, setDraftPrice] = useState(100);
  const [draftHours, setDraftHours] = useState(48);
  const [draftIncrement, setDraftIncrement] = useState(10);
  const [detailAuction, setDetailAuction] = useState<Auction | null>(null);
  const [expandedBids, setExpandedBids] = useState<string | null>(null);

  const activeAuctions = auctions.filter((a) => a.status === "active" || a.status === "sold");
  const expiredAuctions = auctions.filter((a) => a.status === "expired" || a.status === "cancelled");

  const handleCreate = () => {
    if (!draftProductId || draftPrice <= 0) return;
    createAuction(draftProductId, draftPrice, draftHours, draftIncrement);
    setDraftProductId("");
    setDraftPrice(100);
    setDraftHours(48);
  };

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-elegant text-xl text-stone-800">
          Açık Artırmalar ({auctions.length})
        </h2>
      </div>

      {/* Create auction */}
      <div className="rounded-2xl border border-stone-300 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-medium text-stone-800">Yeni Açık Artırma Oluştur</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Ürün">
            <select
              value={draftProductId}
              onChange={(e) => setDraftProductId(e.target.value)}
              className="inp"
            >
              <option value="">Seçin</option>
              {products
                .filter((p) => !auctions.some((a) => a.productId === p.id && a.status === "active"))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.price}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Başlangıç Fiyatı (₺)">
            <input
              type="number"
              value={draftPrice}
              onChange={(e) => setDraftPrice(Number(e.target.value) || 0)}
              className="inp"
              min={1}
            />
          </Field>
          <Field label="Süre (saat)">
            <select
              value={draftHours}
              onChange={(e) => setDraftHours(Number(e.target.value))}
              className="inp"
            >
              <option value={1}>1 saat</option>
              <option value={6}>6 saat</option>
              <option value={12}>12 saat</option>
              <option value={24}>24 saat</option>
              <option value={48}>48 saat</option>
              <option value={72}>3 gün</option>
              <option value={168}>7 gün</option>
            </select>
          </Field>
          <Field label="Min. Artış (₺)">
            <input
              type="number"
              value={draftIncrement}
              onChange={(e) => setDraftIncrement(Number(e.target.value) || 10)}
              className="inp"
              min={1}
            />
          </Field>
        </div>
        <button
          onClick={handleCreate}
          disabled={!draftProductId || draftPrice <= 0}
          className="mt-4 rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          Açık Artırmayı Başlat
        </button>
      </div>

      {/* Active / Sold auctions */}
      <div className="space-y-3">
        {activeAuctions.map((a) => {
          const product = products.find((p) => p.id === a.productId);
          const abids = getAuctionBids(a.id);
          const isExpired = a.status === "active" && now > a.endTime;
          return (
            <div key={a.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-4">
                {product?.images[0] && (
                  <img src={product.images[0]} alt="" className="h-20 w-16 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-800">{a.productName}</p>
                      <p className="text-xs text-stone-400">
                        Başlangıç: ₺{a.startPrice} · Güncel: ₺{a.currentPrice} · {a.bidCount} teklif
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      a.status === "active" ? "bg-emerald-100 text-emerald-700" :
                      a.status === "sold" ? "bg-blue-100 text-blue-700" :
                      "bg-stone-200 text-stone-500"
                    }`}>
                      {a.status === "active" ? "Aktif" : a.status === "sold" ? `Satıldı — ₺${a.soldPrice}` : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    {new Date(a.startTime).toLocaleString("tr-TR")} — {new Date(a.endTime).toLocaleString("tr-TR")}
                  </p>
                  {a.status === "active" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => setDetailAuction(a)}
                        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
                      >
                        Detay
                      </button>
                      <button
                        onClick={() => setExpandedBids(expandedBids === a.id ? null : a.id)}
                        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
                      >
                        Teklifler ({abids.length})
                      </button>
                      <button
                        onClick={() => cancelAuction(a.id)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        İptal Et
                      </button>
                    </div>
                  )}
                  {a.status === "sold" && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
                      Kazanan: {a.winnerName} — ₺{a.soldPrice}
                    </div>
                  )}
                </div>
              </div>

              {/* Bids dropdown */}
              {expandedBids === a.id && (
                <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3">
                  {abids.length === 0 ? (
                    <p className="text-xs text-stone-400">Henüz teklif yok</p>
                  ) : (
                    abids.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 p-2.5">
                        <div>
                          <span className="text-sm font-medium text-stone-800">{b.userName}</span>
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            b.status === "active" ? "bg-amber-100 text-amber-700" :
                            b.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {b.status === "active" ? "Bekliyor" : b.status === "accepted" ? "Kabul" : "Red"}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-stone-800">₺{b.amount}</span>
                        {a.status === "active" && b.status === "active" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => acceptBid(a.id, b.id)}
                              className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                            >
                              Kabul
                            </button>
                            <button
                              onClick={() => rejectBid(a.id, b.id)}
                              className="rounded-md border border-red-200 px-2.5 py-1 text-[11px] text-red-600 hover:bg-red-50"
                            >
                              Red
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
        {activeAuctions.length === 0 && (
          <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-400">
            Henüz açık artırma yok
          </p>
        )}
      </div>

      {/* Expired / Cancelled */}
      {expiredAuctions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-stone-500">Geçmiş Açık Artırmalar</h3>
          <div className="space-y-2">
            {expiredAuctions.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-600">{a.productName}</p>
                  <p className="text-xs text-stone-400">{a.bidCount} teklif · ₺{a.currentPrice}</p>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500">
                  {a.status === "expired" ? "Süresi Doldu" : "İptal"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailAuction && (
        <AuctionDetailPanel auction={detailAuction} onClose={() => setDetailAuction(null)} />
      )}
    </div>
  );
}

/* -------- Çark & Ödüller -------- */
function WheelTab() {
  const { products, spinPrizes, userCoupons, userGifts, users, addUserCoupon, addPoints, setFastShipping, currentUser, addToast, giftProductId, setGiftProductId } = useStore();
  const [manualUserId, setManualUserId] = useState("");
  const [manualPoints, setManualPoints] = useState(100);
  const [manualDiscount, setManualDiscount] = useState(10);

  const allCoupons = userCoupons;
  const allGifts = userGifts;
  const usedCoupons = allCoupons.filter((c) => c.used);
  const activeCoupons = allCoupons.filter((c) => !c.used);
  const claimedGifts = allGifts.filter((g) => g.claimed);
  const unclaimedGifts = allGifts.filter((g) => !g.claimed);

  const cardClass = "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm";

  return (
    <div className="space-y-6">
      <h2 className="font-elegant text-xl text-stone-800">Çark & Ödüller</h2>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wider text-stone-400">Toplam Çevrilme</p>
          <p className="mt-1 text-2xl font-bold text-stone-800">{spinPrizes.length}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wider text-stone-400">Kupon (Kullanılmamış)</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{activeCoupons.length}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wider text-stone-400">Kupon (Kullanılmış)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{usedCoupons.length}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wider text-stone-400">Hediye Talebi</p>
          <p className="mt-1 text-2xl font-bold text-rose-700">{unclaimedGifts.length}</p>
        </div>
      </div>

      {/* Hediye ürün ayarı */}
      <div className={cardClass}>
        <h3 className="mb-4 text-sm font-semibold text-stone-700">🎁 Hediye Ürün Ayarı</h3>
        <div className="flex items-center gap-3">
          <select
            value={giftProductId}
            onChange={(e) => setGiftProductId(e.target.value)}
            className="inp max-w-sm"
          >
            <option value="">Hediye ürün seçilmedi</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.price}</option>
            ))}
          </select>
          {giftProductId && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              ✓ {products.find((p) => p.id === giftProductId)?.name}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-stone-400">Çarkta "HEDİYE" kazanan kullanıcıya bu ürün ücretsiz verilir.</p>
      </div>

      {/* Son çevrilmeler */}
      <div className={cardClass}>
        <h3 className="mb-4 text-sm font-semibold text-stone-700">🔄 Son Çevrilmeler</h3>
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {spinPrizes.length === 0 ? (
            <p className="text-xs text-stone-400">Henüz çevrilme yok</p>
          ) : (
            [...spinPrizes].reverse().slice(0, 20).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-2 text-xs">
                <span className={
                  "font-medium " + (
                    s.prize === "gift" ? "text-rose-700" :
                    s.prize === "fastship" ? "text-blue-700" :
                    s.prize.startsWith("points") ? "text-emerald-700" :
                    "text-amber-700"
                  )
                }>
                  {s.prize === "gift" ? "🎁 Hediye" :
                   s.prize === "fastship" ? "🚀 Hızlı Gönderim" :
                   s.prize.startsWith("points") ? `⭐ ${s.label} Puan` :
                   `🏷️ ${s.label} İndirim`}
                </span>
                <span className="text-stone-400">{new Date(s.date).toLocaleString("tr-TR")}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Kuponlar */}
      <div className={cardClass}>
        <h3 className="mb-4 text-sm font-semibold text-stone-700">🎟️ Kuponlar ({allCoupons.length})</h3>
        <div className="max-h-60 space-y-1.5 overflow-y-auto">
          {allCoupons.length === 0 ? (
            <p className="text-xs text-stone-400">Henüz kupon yok</p>
          ) : (
            [...allCoupons].reverse().map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-800">{c.code}</span>
                  <span>%{c.discountPercent}</span>
                  <span className="text-stone-400">— {c.description}</span>
                </div>
                <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + (c.used ? "bg-stone-200 text-stone-500" : "bg-emerald-100 text-emerald-700")}>
                  {c.used ? "Kullanıldı" : "Aktif"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hediye ürün talepleri */}
      <div className={cardClass}>
        <h3 className="mb-4 text-sm font-semibold text-stone-700">🎁 Hediye Talepleri</h3>
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {allGifts.length === 0 ? (
            <p className="text-xs text-stone-400">Henüz hediye kazanılmamış</p>
          ) : (
            [...allGifts].reverse().map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-2 text-xs">
                <div>
                  <span className="font-medium text-stone-800">{g.productName}</span>
                  <span className="ml-2 text-stone-400">— {g.userId}</span>
                </div>
                <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + (g.claimed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                  {g.claimed ? "Teslim Alındı" : "Bekliyor"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Kullanıcı puanları */}
      <div className={cardClass}>
        <h3 className="mb-4 text-sm font-semibold text-stone-700">⭐ Kullanıcı Puanları</h3>
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {users.filter((u) => (u.points || 0) > 0).length === 0 ? (
            <p className="text-xs text-stone-400">Henüz puan kazanan yok</p>
          ) : (
            users.filter((u) => (u.points || 0) > 0).map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-stone-100 p-2 text-xs">
                <span className="font-medium text-stone-800">{u.name}</span>
                <span className="font-bold text-emerald-700">{u.points} puan</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Manuel ödül verme */}
      <div className={cardClass}>
        <h3 className="mb-4 text-sm font-semibold text-stone-700">🛠️ Manuel Ödül Ver</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kullanıcı ID">
            <input value={manualUserId} onChange={(e) => setManualUserId(e.target.value)} placeholder="Kullanıcı ID'si" className="inp" />
          </Field>
          <Field label="Puan">
            <input type="number" value={manualPoints} onChange={(e) => setManualPoints(Number(e.target.value) || 0)} className="inp" />
          </Field>
          <Field label="İndirim %">
            <input type="number" value={manualDiscount} onChange={(e) => setManualDiscount(Number(e.target.value) || 0)} className="inp" />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => { if (manualUserId) { addPoints(manualUserId, manualPoints); addToast(`${manualPoints} puan eklendi`, "success"); } }}
            disabled={!manualUserId}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Puan Ver
          </button>
          <button
            onClick={() => { if (manualUserId && manualDiscount > 0) { addUserCoupon(manualUserId, manualDiscount); addToast(`%${manualDiscount} kupon oluşturuldu`, "success"); } }}
            disabled={!manualUserId || manualDiscount <= 0}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Kupon Ver
          </button>
          <button
            onClick={() => { if (manualUserId) { setFastShipping(manualUserId); addToast("Hızlı gönderim hakkı verildi", "success"); } }}
            disabled={!manualUserId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            🚀 Hızlı Gönderim Ver
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------- Field helper -------- */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ---------------- Shell ---------------- */
const TABS = [
  { id: "products", label: "Ürünler" },
  { id: "auctions", label: "Açık Artırma" },
  { id: "wheel", label: "Çark & Ödüller" },
  { id: "statistics", label: "İstatistikler" },
  { id: "discounts", label: "İndirimler" },
  { id: "reviews", label: "Yorumlar" },
  { id: "messages", label: "Mesajlar" },
  { id: "settings", label: "Ayarlar" },
] as const;

export default function Admin({ onExit }: { onExit: () => void }) {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem("msgrdrps_admin") === "1"
  );
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("products");
  const { conversations, settings } = useStore();
  const unread = conversations.reduce((s, c) => s + c.unreadByAdmin, 0);

  // Auto-sync timer
  useEffect(() => {
    if (!settings.autoSync) return;
    const id = setInterval(async () => {
      try {
        await fetch("/api/scrape-gardrops-store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: settings.gardropsUrl }),
        });
      } catch {}
    }, settings.syncIntervalMs);
    return () => clearInterval(id);
  }, [settings.autoSync, settings.syncIntervalMs, settings.gardropsUrl]);

  if (!authed)
    return (
      <Login
        onOk={() => {
          sessionStorage.setItem("msgrdrps_admin", "1");
          setAuthed(true);
        }}
        onBack={onExit}
      />
    );

  return (
    <div className="min-h-screen bg-[#f7f1e7]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <img
            src={logoSrc}
            alt="MS"
            className="h-50 w-auto object-contain"
            />
            <span className="text-sm font-medium text-stone-400">panel</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExit}
              className="rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
            >
              Siteye Dön
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem("msgrdrps_admin");
                setAuthed(false);
              }}
              className="rounded-full bg-stone-800 px-4 py-1.5 text-sm text-white hover:bg-stone-700"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition"
            >
              <span
                className={
                  "inline-block rounded-full px-3 py-1 transition " +
                  (tab === t.id
                    ? "bg-stone-800 text-white"
                    : "border border-stone-300 text-stone-600 hover:border-stone-500")
                }
              >
                {t.label}
              </span>
              {t.id === "messages" && unread > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "products" && <ProductsTab />}
        {tab === "auctions" && <AuctionsTab />}
        {tab === "wheel" && <WheelTab />}
        {tab === "statistics" && <StatsTab />}
        {tab === "discounts" && <DiscountsTab />}
        {tab === "reviews" && <ReviewsTab />}
        {tab === "messages" && <MessagesTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
