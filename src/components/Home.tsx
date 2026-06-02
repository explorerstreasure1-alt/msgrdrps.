import { useMemo, useRef, useState, useEffect } from "react";
import { useStore, type Product, type Auction } from "../lib/store";
import { Stars } from "./Stars";
import ChatWidget from "./ChatWidget";
import ProductCard from "./ProductCard";
import ProductDetailPanel from "./ProductDetailPanel";
import CartPanel from "./CartPanel";
import AccountPanel from "./AccountPanel";
import ComparePanel from "./ComparePanel";
import SpinWheel from "./SpinWheel";
import { Toast } from "./Toast";
import { AuctionDetailPanel } from "./AuctionDetailPanel";
import logoSrc from "../logo.png";

type ConditionFilter = "all" | "new" | "second";

function TopBar() {
  return (
    <div className="bg-stone-800 py-2 pb-3 text-center sm:py-2">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 text-xs tracking-wide text-stone-200">
        <span className="hidden sm:inline">🚚</span>
        <span>Ücretsiz Kargo</span>
        <span className="h-3 w-px bg-stone-500 hidden sm:inline"></span>
        <span className="hidden sm:inline">🛍️</span>
        <span>Gardrops üzerinden güvenli alışveriş</span>
        <span className="h-3 w-px bg-stone-500 hidden sm:inline"></span>
        <span className="hidden sm:inline">⚠️</span>
        <span>İade kabul edilmez</span>
      </div>
    </div>
  );
}

function CartButton({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
      <span className="hidden sm:inline">Sepet</span>
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <a href="/" className="flex items-center">
      <img
        src={logoSrc}
        alt="MSgrdrps"
        className={(className || "h-28") + " w-auto object-contain sm:h-72"}
      />
    </a>
  );
}

function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPos({ x, y });
    const rotX = (y - 0.5) * -30;
    const rotY = (x - 0.5) * 30;
    cardRef.current!.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`;
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.3) 0%, transparent 60%)`;
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setPos({ x: 0.5, y: 0.5 });
    if (cardRef.current) cardRef.current.style.transform = "rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    if (glowRef.current) glowRef.current.style.background = "";
  };

  return (
    <section className="relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-stone-300/20 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 py-2 lg:grid-cols-2 lg:py-16">
        <div className="space-y-3 sm:space-y-6" data-aos="fade-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/70 px-5 py-1.5 text-xs font-medium text-stone-700 shadow-sm uppercase tracking-[0.2em]">
            ⋆ Yeni Fırsat Ürünleri ⋆
          </div>
          <p className="text-base uppercase tracking-[0.3em] text-amber-700">
            Ucuzun En Kaliteli Hali
          </p>
          <h1 className="font-elegant text-5xl leading-tight text-stone-800 lg:text-7xl">
            Gardrops İkinci El <br /> Özel Seçimleri
          </h1>
          <p className="max-w-xl text-lg text-stone-600 leading-relaxed">
            Zamansız ve sezonsuz ürünler... Sıfır ve ikinci el seçenekleri,
            özel hediyeler ve çoklu ürün indirim fırsatlarıyla, ikinci el
            kültürünün en temiz hali.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#urunler" className="group relative overflow-hidden rounded-full bg-stone-800 px-8 py-4 text-base font-medium text-white shadow-lg shadow-stone-800/20 transition-all hover:shadow-xl hover:shadow-stone-800/30 hover:-translate-y-0.5">
              <span className="relative z-10">Alışverişe Başla</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-stone-700 to-stone-600 transition-transform duration-300 group-hover:translate-x-0" />
            </a>
            <a href="https://www.gardrops.com/msgrdrps" target="_blank" rel="noreferrer"
               className="group flex items-center gap-2 rounded-full border-2 border-stone-800 px-8 py-4 text-base font-medium text-stone-800 transition-all hover:bg-stone-800 hover:text-white hover:-translate-y-0.5 hover:shadow-lg">
              Gardrops Mağazamız
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 sm:gap-6 sm:pt-4">
            <div className="flex items-center gap-2 bg-white/60 rounded-full px-4 py-2 shadow-sm">
              <Stars rating={5} size={22} />
              <span className="text-base font-semibold text-stone-700">5.0</span>
            </div>
          </div>
        </div>

        <div className="relative perspective-1000 flex items-center justify-center" style={{ perspective: "1200px" }}>
          {/* Inner shadow / depth ring */}
          <div className="absolute inset-0 rounded-3xl shadow-[inset_0_2px_20px_rgba(0,0,0,0.08)] pointer-events-none z-10" />

          {/* Glow overlay */}
          <div ref={glowRef} className="absolute inset-0 z-10 pointer-events-none rounded-3xl transition-all duration-100" />

          {/* Shine reflection */}
          <div
            className="absolute inset-0 z-10 pointer-events-none rounded-3xl opacity-0 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `linear-gradient(${pos.x * 180}deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)`,
            }}
          />

          {/* Border gradient */}
          <div
            className="absolute inset-0 rounded-3xl p-[3px] transition-all duration-500"
            style={{
              background: isHovered
                ? `linear-gradient(${pos.x * 360}deg, #fde68a, #fbbf24, #d4d4d4, #fde68a)`
                : "linear-gradient(135deg, #ffffff, #e7e5e4, #ffffff)",
            }}
          >
            <div className="h-full w-full rounded-[calc(1.5rem-3px)] bg-white" />
          </div>

          {/* Image card */}
          <div
            ref={cardRef}
            className="relative z-0 overflow-hidden rounded-3xl shadow-2xl shadow-stone-300/40 transition-shadow duration-500"
            style={{
              transformStyle: "preserve-3d",
              transition: "transform 0.2s ease-out",
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
          >
            <img
              src="https://images.pexels.com/photos/7318681/pexels-photo-7318681.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=900"
              alt="Koleksiyon"
              className="aspect-[4/5] w-full object-cover"
              style={{ transformStyle: "preserve-3d" }}
              draggable={false}
            />
            {/* Bottom gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>

          {/* Floating decorative dots */}
          <div className="pointer-events-none absolute -right-6 -top-6 z-20 h-12 w-12 rounded-full bg-amber-300/30 blur-sm animate-pulse" />
          <div className="pointer-events-none absolute -bottom-4 -left-4 z-20 h-8 w-8 rounded-full bg-stone-400/20 blur-sm animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
      </div>
    </section>
  );
}

function CategoriesStrip({ onPick }: { onPick: (c: string) => void }) {
  const { products } = useStore();
  const cats = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-1 sm:py-8">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cats.map((cat) => (
          <button
            key={cat}
            onClick={() => onPick(cat)}
            className="group rounded-2xl border border-stone-200 bg-white p-4 text-center transition hover:-translate-y-1 hover:border-stone-400 hover:shadow-lg"
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#efe5d4] text-stone-700">
              <span className="font-elegant text-sm">{cat.charAt(0)}</span>
            </div>
            <p className="text-xs font-medium text-stone-700">{cat}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function ReviewSection() {
  const { reviews, settings, fetchGardropsReviews } = useStore();
  const [fetching, setFetching] = useState(false);
  const featured = reviews.slice(0, 4);

  const handleFetch = async () => {
    if (fetching) return;
    setFetching(true);
    await fetchGardropsReviews(settings.gardropsUrl);
    setFetching(false);
  };

  return (
    <section id="yorumlar" className="bg-[#efe5d4] py-14" data-aos="fade-up">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700">
            Gardrops Yorumları
          </p>
          <h2 className="mt-2 font-elegant text-4xl text-stone-800">
            Müşterilerimiz ne diyor?
          </h2>
          <div className="mt-3 flex items-center justify-center gap-3">
            <Stars rating={5} size={22} />
            <span className="text-lg font-semibold text-stone-800">5.0</span>
            <span className="text-sm text-stone-500">({reviews.length} yorum)</span>
          </div>
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/70 px-5 py-1.5 text-xs font-medium text-stone-700 hover:bg-white transition disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={fetching ? "animate-spin" : ""}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {fetching ? "Çekiliyor..." : "Gardrops Yorumlarını Çek"}
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((r) => (
            <div
              key={r.id}
              className="flex flex-col rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg overflow-hidden"
            >
              {r.image && (
                <div className="h-44 w-full overflow-hidden bg-stone-100">
                  <img
                    src={r.image}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <div className="flex flex-col p-5 pt-4 flex-1">
                <Stars rating={r.rating} />
                <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">
                  "{r.text}"
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-stone-100 pt-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efe5d4] text-sm font-semibold text-stone-700">
                    {r.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      @{r.author}
                    </p>
                    <p className="text-xs text-stone-400">{r.date}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoStrip() {
  const items = [
    { icon: "📦", title: "Hızlı Kargo", desc: "Aynı gün kargo, ücretsiz teslimat" },
    { icon: "🎁", title: "Ücretsiz Hediye", desc: "Seçtiğiniz her ürüne özel hediye" },
    { icon: "💎", title: "Güvenli Ödeme", desc: "Gardrops ile %100 güvenli alışveriş" },
    { icon: "⭐", title: "Premium Kalite", desc: "Özenle seçilmiş parçalar" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-12" data-aos="fade-up">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.title}
            className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-2 text-3xl">{it.icon}</div>
            <h3 className="font-elegant text-lg text-stone-800">{it.title}</h3>
            <p className="mt-2 text-sm text-stone-500">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home({ onAdmin }: { onAdmin: () => void }) {
  const { products, cart, favorites, currentUser, settings, compareIds, addToCart, toasts, dismissToast, auctions } = useStore();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [spinOpen, setSpinOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [activeCategory, setActiveCategory] = useState("Tümü");
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>("all");
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc" | "discount">(
    "default"
  );
  const [shopFilter, setShopFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");

  // URL param parsing for product share links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product");
    if (productId) {
      const p = products.find((x) => x.id === productId);
      if (p) setSelectedProduct(p);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [products]);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    const result = await (installPrompt as any).userChoice;
    if (result.outcome === "accepted") setInstallPrompt(null);
  };

  useEffect(() => {
    if (menuOpen) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const categories = useMemo(
    () => ["Tümü", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );
  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      if (activeCategory !== "Tümü" && p.category !== activeCategory) return false;
      if (conditionFilter === "new" && p.condition !== "new") return false;
      if (conditionFilter === "second" && p.condition !== "second") return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.category.toLowerCase().includes(q)
        )
          return false;
      }
      if (priceMin && p.priceNum < parseInt(priceMin)) return false;
      if (priceMax && p.priceNum > parseInt(priceMax)) return false;
      if (shopFilter !== "all" && (p.shop || "msgrdrps") !== shopFilter) return false;
      if (brandFilter !== "all" && (p.brand || "") !== brandFilter) return false;
      return true;
    });

    if (sort === "price-asc") list = [...list].sort((a, b) => a.priceNum - b.priceNum);
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.priceNum - a.priceNum);
    else if (sort === "discount") {
      list = [...list].sort((a, b) => {
        const da = a.hasDiscount && a.originalPriceNum ? (a.originalPriceNum - a.priceNum) / a.originalPriceNum : 0;
        const db = b.hasDiscount && b.originalPriceNum ? (b.originalPriceNum - b.priceNum) / b.originalPriceNum : 0;
        return db - da;
      });
    }
    return list;
  }, [products, activeCategory, conditionFilter, search, sort, priceMin, priceMax, shopFilter, brandFilter]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product);
    document.body.style.overflow = "hidden";
  };
  const handleCloseProduct = () => {
    setSelectedProduct(null);
    document.body.style.overflow = "";
  };
  const handleOpenCart = () => {
    setCartOpen(true);
    document.body.style.overflow = "hidden";
  };
  const handleOpenAuction = (a: Auction) => {
    setSelectedAuction(a);
    if (a) document.body.style.overflow = "hidden";
  };
  const handleCloseAuction = () => {
    setSelectedAuction(null);
    document.body.style.overflow = "";
  };
  const handleCloseCart = () => {
    setCartOpen(false);
    document.body.style.overflow = "";
  };

  return (
    <div className="min-h-screen bg-[#f7f1e7] text-stone-800 overflow-x-hidden">
      <TopBar />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#f7f1e7]/95 backdrop-blur">
        {/* Desktop layout */}
        <div className="mx-auto hidden max-w-7xl items-center justify-between gap-1 pl-1 pr-4 py-1 md:flex">
          <Logo />
          <div className="relative flex-1 max-w-md">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün, kategori ara..."
              className="w-full rounded-full border border-stone-300 bg-white pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-stone-500 focus:shadow" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <nav className="hidden items-center gap-5 text-sm font-medium text-stone-700 lg:flex">
            <a href="#urunler" className="hover:text-stone-900">Ürünler</a>
            <a href="#yorumlar" className="hover:text-stone-900">Yorumlar</a>
            <a href="#favori" className="hover:text-stone-900">Favoriler ({favorites.length})</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setAccountOpen(true)} className="flex items-center gap-1.5 rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{currentUser ? currentUser.name.split(" ")[0] : "Giriş Yap"}</span>
            </button>
            <CartButton onClick={handleOpenCart} count={cartCount} />
            <button onClick={() => setCompareOpen(true)} className="relative flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
              {compareIds.length > 0 && (<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[9px] text-white">{compareIds.length}</span>)}
            </button>
            <button onClick={onAdmin} className="rounded-full bg-stone-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700">Admin</button>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden">
          <div className="flex items-center justify-between px-3 py-3 w-full">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 -ml-1 text-stone-600 hover:text-stone-900 transition-colors" aria-label="Menü">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="flex-1 flex justify-center">
              <img src={logoSrc} alt="MSgrdrps" className="h-24 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setAccountOpen(true)} className="p-1.5 text-stone-600 hover:text-stone-900 transition-colors" aria-label="Hesap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              <button onClick={handleOpenCart} className="relative p-1.5 text-stone-600 hover:text-stone-900 transition-colors" aria-label="Sepet">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-semibold text-white">{cartCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="relative px-3 pb-1.5">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün ara..."
              className="w-full rounded-full border border-stone-300 bg-white pl-9 pr-3 py-1.5 text-xs outline-none focus:border-stone-500" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

      </header>

      {/* Mobile slide-out drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-[80vw] max-w-[340px] bg-[#FDFBF7] shadow-[5px_0_25px_rgba(0,0,0,0.05)] p-6 flex flex-col transition-all duration-300">
            <div className="flex items-center justify-between pb-6 border-b border-stone-200/60">
              <span className="font-serif italic text-lg tracking-wider text-stone-800">msgrdrps.</span>
              <button onClick={() => setMenuOpen(false)} className="text-stone-400 hover:text-stone-800 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <nav className="flex flex-col gap-6 mt-8">
              <button onClick={() => { setAccountOpen(true); setMenuOpen(false); }} className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-medium text-stone-700 hover:text-black hover:pl-2 transition-all duration-200 border-b border-stone-100 pb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {currentUser ? "Hesabım" : "Giriş Yap / Kayıt Ol"}
              </button>
              <button onClick={() => { setCompareOpen(true); setMenuOpen(false); }} className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-medium text-stone-700 hover:text-black hover:pl-2 transition-all duration-200 border-b border-stone-100 pb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
                Karşılaştır {compareIds.length > 0 && `(${compareIds.length})`}
              </button>
              <button onClick={() => { onAdmin(); setMenuOpen(false); }} className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-medium text-stone-700 hover:text-black hover:pl-2 transition-all duration-200 border-b border-stone-100 pb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                Admin Paneli
              </button>
              {installPrompt && (
                <button onClick={() => { handleInstall(); setMenuOpen(false); }} className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-medium text-stone-700 hover:text-black hover:pl-2 transition-all duration-200 border-b border-stone-100 pb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Uygulamayı İndir
                </button>
              )}
            </nav>
            <div className="mt-auto text-[10px] tracking-widest text-stone-400 uppercase">
              © 2026 msgrdrps.
            </div>
          </div>
        </div>
      )}

      <Hero />
      <CategoriesStrip onPick={(c) => {
        setActiveCategory(c);
        document.getElementById("urunler")?.scrollIntoView({ behavior: "smooth" });
      }} />

      {/* Products */}
      <main id="urunler" className="mx-auto max-w-7xl px-4 pb-16 pt-1 sm:pt-8" data-aos="fade-up" data-aos-delay="100">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2 sm:mb-6 sm:gap-3">
          <div>
            <p className="pt-4 text-sm uppercase tracking-[0.25em] text-amber-700 sm:pt-0">
              Koleksiyon
            </p>
            <div className="flex items-center gap-6">
              <h2 className="font-elegant text-3xl text-stone-800 sm:text-4xl">
                Tüm Ürünler
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (currentUser) setSpinOpen(true); else setAccountOpen(true); }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5efe4] shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 group border border-[#e8dccc]"
                  title={currentUser ? "Çarkı Çevir & Kazan" : "Giriş yapıp çarkı çevir!"}
                >
                  <svg width="64" height="64" viewBox="1 1 22 22" fill="none" stroke="#a68958" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-500 group-hover:rotate-180">
                    <circle cx="12" cy="12" r="10" fill="#f5efe4" stroke="none"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#c4a99a" strokeWidth="1.8"/>
                    <path d="M12 6a6 6 0 0 1 6 6" stroke="#c4a99a" strokeWidth="1.8"/>
                    <circle cx="12" cy="12" r="2.8" fill="#d4af37" stroke="#d4af37" strokeWidth="1.2"/>
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="#c4a99a" strokeWidth="1.2"/>
                  </svg>
                </button>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wider whitespace-nowrap">Çarkı Çevir</p>
                  <p className="text-[10px] text-stone-400">Ödül kazan!</p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              {filteredProducts.length} ürün listeleniyor
            </p>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">

            <label className="text-xs font-semibold text-stone-500">Sırala:</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm outline-none"
            >
              <option value="default">Varsayılan</option>
              <option value="price-asc">Fiyata göre (Artan)</option>
              <option value="price-desc">Fiyata göre (Azalan)</option>
              <option value="discount">İndirim Oranı</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 mt-4 flex flex-col gap-2 border-y border-stone-200 bg-white/60 p-3 sm:flex-row sm:items-center sm:gap-3 sm:flex-wrap sm:mt-0" data-aos="fade-up" data-aos-delay="150">
          <div className="flex gap-2 overflow-x-auto sm:flex-wrap" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={
                  "rounded-full px-4 py-2 text-xs font-medium transition " +
                  (activeCategory === cat
                    ? "bg-stone-800 text-white shadow"
                    : "border border-stone-300 text-stone-600 hover:border-stone-500")
                }
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto sm:ml-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">FİYAT:</span>
            <input
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value.replace(/\D/g, ""))}
              placeholder="Min"
              className="w-14 rounded-full border border-stone-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-stone-500"
            />
            <span className="text-[10px] text-stone-400">-</span>
            <input
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value.replace(/\D/g, ""))}
              placeholder="Maks"
              className="w-14 rounded-full border border-stone-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-stone-500"
            />
            <span className="h-4 w-px bg-stone-300"></span>
            {(settings.shops || []).length > 1 && (
              <>
                <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">MAĞAZA:</span>
                <select
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  className="rounded-full border border-stone-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-stone-500"
                >
                  <option value="all">Tümü</option>
                  {settings.shops.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <span className="h-4 w-px bg-stone-300"></span>
              </>
            )}
            <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">DURUM:</span>
            {([
              { id: "all", label: "Tümü" },
              { id: "new", label: "Sıfır" },
              { id: "second", label: "İkinci El" },
            ] as { id: ConditionFilter; label: string }[]).map((c) => (
              <button
                key={c.id}
                onClick={() => setConditionFilter(c.id)}
                className={
                  "rounded-full border px-2.5 py-1.5 text-xs font-medium transition whitespace-nowrap " +
                  (conditionFilter === c.id
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-300 text-stone-600 hover:border-stone-500")
                }
              >
                {c.label}
              </button>
            ))}
            {brands.length > 0 && (
              <>
                <span className="h-4 w-px bg-stone-300"></span>
                <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">MARKA:</span>
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="rounded-full border border-stone-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-stone-500"
                >
                  <option value="all">Tümü</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => handleOpenProduct(product)}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="mb-2 text-5xl">🔍</div>
            <p className="text-lg font-semibold text-stone-700">
              Aramanızda ürün bulunamadı
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Farklı bir filtre veya arama terimi deneyin.
            </p>
          </div>
        )}
      </main>

      {/* Active Auctions */}
      {auctions.filter((a) => a.status === "active").length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10" data-aos="fade-up">
          <div className="mb-6 text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-amber-700">Açık Artırma</p>
            <h2 className="font-elegant text-3xl text-stone-800 sm:text-4xl">Aktif Açık Artırmalar</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.filter((a) => a.status === "active").map((a) => {
              const now = Date.now();
              const diff = Math.max(0, a.endTime - now);
              const h = Math.floor(diff / 3600000);
              const m = Math.floor((diff % 3600000) / 60000);
              const expired = diff <= 0;
              return (
                <div
                  key={a.id}
                  className="group cursor-pointer rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  onClick={() => handleOpenAuction(a)}
                >
                  {a.productImage && (
                    <div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-stone-100">
                      <img src={a.productImage} alt={a.productName} className="h-full w-full object-cover transition group-hover:scale-105" />
                    </div>
                  )}
                  <h3 className="font-medium text-stone-800 truncate">{a.productName}</h3>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-stone-50 p-2">
                      <p className="text-stone-400">Güncel</p>
                      <p className="font-bold text-stone-800">₺{a.currentPrice}</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 p-2">
                      <p className="text-stone-400">Teklif</p>
                      <p className="font-bold text-amber-700">{a.bidCount}</p>
                    </div>
                    <div className="rounded-lg bg-stone-50 p-2">
                      <p className="text-stone-400">Süre</p>
                      <p className={`font-bold font-mono tabular-nums ${expired ? "text-red-600" : "text-stone-800"}`}>
                        {expired ? "Bitti" : `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenAuction(a); }}
                    className="mt-3 w-full rounded-lg bg-stone-800 py-2 text-sm font-medium text-white hover:bg-stone-700"
                  >
                    Teklif Ver
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <InfoStrip />
      <ReviewSection />

      {/* Favorites */}
      {favorites.length > 0 && (
        <section id="favori" className="border-t border-stone-200 bg-white py-12">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-amber-700">Favorilerin</p>
                <h2 className="font-elegant text-2xl text-stone-800">Beğendiklerin</h2>
              </div>
              <p className="text-xs text-stone-400">{favorites.length} ürün</p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
              {products.filter((p) => favorites.includes(p.id)).map((p) => (
                <div key={p.id} className="w-36 flex-shrink-0">
                  <div className="cursor-pointer rounded-xl border border-stone-200 bg-white p-2 transition hover:shadow-md" onClick={() => handleOpenProduct(p)}>
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-stone-100">
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <p className="mt-1.5 truncate text-xs font-medium text-stone-700">{p.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs font-bold text-stone-900">{p.priceNum.toLocaleString("tr-TR")} ₺</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart({ productId: p.id, quantity: 1 }); }}
                        disabled={p.status === "out" || p.stock === 0}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-40"
                        title="Sepete Ekle"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-[#efe5d4]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 text-center">
          <Logo className="h-32 sm:h-72" />
          <p className="max-w-md text-sm text-stone-600">
            Bej ve fil dişi tonlarında, zamansız giyim koleksiyonu. Gardrops
            üzerinden güvenli ödeme ile en premium alışveriş deneyimi.
          </p>
          <a
            href="https://www.gardrops.com/msgrdrps"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-stone-800 px-6 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Gardrops Mağazamız
          </a>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-stone-500">
            <span>Ücretsiz Kargo</span>
            <span>•</span>
            <span>Güvenli Ödeme</span>
            <span>•</span>
            <span>İade edilmez</span>
          </div>
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} MSgrdrps. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>

      {/* Panels */}
      {selectedProduct && (
        <ProductDetailPanel product={selectedProduct} onClose={handleCloseProduct} onCartOpen={handleOpenCart} />
      )}
      {selectedAuction && (
        <AuctionDetailPanel auction={selectedAuction} onClose={handleCloseAuction} />
      )}
      {cartOpen && <CartPanel onClose={handleCloseCart} />}
      {accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} />}
      {compareOpen && <ComparePanel onClose={() => setCompareOpen(false)} />}
      {spinOpen && <SpinWheel onClose={() => setSpinOpen(false)} />}

      <ChatWidget />



      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 right-6 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <Toast key={t.id} msg={t} onDone={() => dismissToast(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
