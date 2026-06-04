import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { ToastMsg } from "../components/Toast";
import { apiFetch } from "./api";

/* ---------------------------- Types ---------------------------- */

export interface Product {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  originalPriceNum?: number;
  originalPrice?: string;
  discount?: number;
  hasDiscount?: boolean;
  category: string;
  description: string;
  images: string[];
  gardropsUrl: string;
  condition: "new" | "second";
  status: "active" | "out";
  stock: number;
  gifts: Gift[];
  shop?: string;
  brand?: string;
  gardropsStatus?: "active" | "sold" | "unknown";
  gardropsCheckedAt?: number;
}

export interface Gift {
  id: string;
  title: string;
  image?: string;
  stock: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  image?: string;
}

export interface Message {
  id: string;
  sender: "customer" | "admin" | "system";
  text: string;
  attachments?: { type: "image" | "file" | "link"; url: string; label?: string }[];
  time: number;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  unreadByAdmin: number;
  lastActive: number;
  blocked: boolean;
  seenByAdmin: boolean;
}

export interface DiscountCode {
  id: string;
  code: string;
  minQuantity: number;
  percentage: number;
  description: string;
  active: boolean;
}

export interface Settings {
  gardropsUrl: string;
  autoWelcome: string;
  autoSync: boolean;
  syncIntervalMs: number;
  lastSyncTimestamp: number;
  shops: { name: string; url: string }[];
  adminPhone: string;
  smsEnabled: boolean;
  smsUserCode: string;
  smsPassword: string;
  smsHeader: string;
}

/* ------------------------- Defaults --------------------------- */

const GARDROPS_DEFAULT = "https://www.gardrops.com/msgrdrps";

const DEFAULT_SETTINGS: Settings = {
  gardropsUrl: GARDROPS_DEFAULT,
  autoSync: false,
  syncIntervalMs: 6 * 60 * 60 * 1000,
  lastSyncTimestamp: 0,
  shops: [{ name: "msgrdrps", url: GARDROPS_DEFAULT }],
  autoWelcome:
    "Hoş geldin 🤎\n\n• Ürünleriniz yayından sonra size özel olarak Gardrops hesabımız üzerinden ilan açılacak. Size özel ilan açabilmemiz için isminizi ve soy isminizi bizimle paylaşmayı ve aldığınız ürünlerin görsellerini bizimle paylaşmayı unutmayın!\n\n• Açılan ilan üzerinden satın alma işlemi yapabilirsiniz.\n\n• Gardrops: " +
    GARDROPS_DEFAULT +
    "\n\n• İade kabul etmiyoruz ✕",
  adminPhone: "+905337831636",
  smsEnabled: false,
  smsUserCode: "",
  smsPassword: "",
  smsHeader: "MSGrdrps",
};

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "p0",
    name: "Pembe Kadife Ceket",
    price: "₺399",
    priceNum: 399,
    originalPriceNum: 699,
    originalPrice: "₺699",
    discount: 43,
    hasDiscount: true,
    category: "Üst Giyim",
    brand: "Zara",
    description:
      "Yumuşacık kadife dokulu, zarif pembe ceket. %43 indirimle kaçırmayın!",
    images: [
      "https://picsum.photos/seed/pembe-ceket/800/1200",
    ],
    gardropsUrl: GARDROPS_DEFAULT,
    condition: "new",
    status: "active",
    stock: 7,
    gifts: [
      { id: "g0", title: "Pembe Kılıf", stock: 5 },
    ],
    gardropsStatus: "active",
  },
  {
    id: "p1",
    name: "Bej Oversize Blazer Ceket",
    price: "₺549",
    priceNum: 549,
    category: "Üst Giyim",
    brand: "Mango",
    description:
      "Yumuşak dokulu, rahat kalıplı bej blazer ceket. Hem ofis hem günlük şıklık.",
    images: [
      "https://picsum.photos/seed/bej-blazer/800/1200",
    ],
    gardropsUrl: GARDROPS_DEFAULT,
    condition: "new",
    status: "active",
    stock: 8,
    gifts: [
      { id: "g1", title: "Kumaş Bakım Seti", stock: 5 },
      { id: "g2", title: "Aksesuar Kılıfı", stock: 3 },
    ],
    gardropsStatus: "active",
  },
  {
    id: "p2",
    name: "Fil Dişi Triko Hırka",
    price: "₺389",
    priceNum: 389,
    category: "Triko",
    brand: "H&M",
    description:
      "Sıcacık fil dişi rengi örgü hırka. Sonbahar ve kış kombinlerinin vazgeçilmezi.",
    images: [
      "https://picsum.photos/seed/triko-hirka/800/1200",
    ],
    gardropsUrl: GARDROPS_DEFAULT,
    condition: "new",
    status: "active",
    stock: 12,
    gifts: [],
    gardropsStatus: "active",
  },
  {
    id: "p3",
    name: "Krem Saten Gömlek",
    price: "₺299",
    priceNum: 299,
    category: "Gömlek",
    brand: "Zara",
    description: "Dökümlü saten kumaş, zarif krem tonu. Şık bir duruş için ideal.",
    images: [
      "https://picsum.photos/seed/krem-gomlek/800/1200",
    ],
    gardropsUrl: GARDROPS_DEFAULT,
    condition: "second",
    status: "active",
    stock: 3,
    gifts: [{ id: "g3", title: "Astar Bezi", stock: 0 }],
    gardropsStatus: "active",
  },
  {
    id: "p4",
    name: "Bej Tulum",
    price: "₺459",
    priceNum: 459,
    category: "Tulum",
    brand: "Mango",
    description: "Modern kesim bej tulum. Tek parça ile tamamlanmış zarif kombin.",
    images: [
      "https://picsum.photos/seed/bej-tulum/800/1200",
    ],
    gardropsUrl: GARDROPS_DEFAULT,
    condition: "new",
    status: "active",
    stock: 5,
    gifts: [{ id: "g4", title: "Kemer Hediyesi", stock: 4 }],
    gardropsStatus: "active",
  },
  {
    id: "p5",
    name: "Bej Deri El Çantası",
    price: "₺349",
    priceNum: 349,
    category: "Aksesuar",
    description: "Zarif bej tonlu el çantası. Her kombini tamamlayan şık aksesuar.",
    images: [
      "https://picsum.photos/seed/deri-canta/800/1200",
    ],
    gardropsUrl: GARDROPS_DEFAULT,
    condition: "second",
    status: "active",
    stock: 2,
    gifts: [],
    gardropsStatus: "active",
  },
  {
    id: "p6",
    name: "Nötr Tonlu İkili Takım",
    price: "₺629",
    priceNum: 629,
    category: "Takım",
    brand: "H&M",
    description: "Bej ve fil dişi tonlarında uyumlu ikili takım. Komple şıklık.",
    images: [
      "https://picsum.photos/seed/ikili-takim/800/1200",
    ],
    gardropsUrl: GARDROPS_DEFAULT,
    condition: "new",
    status: "active",
    stock: 6,
    gifts: [{ id: "g5", title: "Mini Şal", stock: 7 }],
    gardropsStatus: "active",
  },
];

const DEFAULT_REVIEWS: Review[] = [
  {
    id: "r1",
    author: "elif_k",
    rating: 5,
    text: "Ürün birebir aynısı geldi, kumaş kalitesi harika. Çok teşekkürler! 🤎",
    date: "2 hafta önce",
    image: "https://picsum.photos/seed/pembe-ceket/200/160",
  },
  {
    id: "r2",
    author: "zeynepm",
    rating: 5,
    text: "Hızlı kargo, ilgili satıcı. Gardrops üzerinden alışveriş çok kolaydı.",
    date: "1 ay önce",
    image: "https://picsum.photos/seed/bej-blazer/200/160",
  },
  {
    id: "r3",
    author: "merve.style",
    rating: 5,
    text: "Bej blazer tam istediğim gibiydi. Kesinlikle tekrar alışveriş yapacağım!",
    date: "1 ay önce",
    image: "https://picsum.photos/seed/bej-tulum/200/160",
  },
  {
    id: "r4",
    author: "ayca_d",
    rating: 5,
    text: "Renkler çok zarif, fotoğraftakiyle aynı. Teşekkürler güvenilir satıcı.",
    date: "2 ay önce",
    image: "https://picsum.photos/seed/deri-canta/200/160",
  },
];

const DEFAULT_DISCOUNTS: DiscountCode[] = [
  {
    id: "d1",
    code: "MS3",
    minQuantity: 3,
    percentage: 10,
    description: "3 ve üstü ürünlerde %10 indirim",
    active: true,
  },
  {
    id: "d2",
    code: "MS5",
    minQuantity: 5,
    percentage: 15,
    description: "5 ve üstü ürünlerde %15 indirim",
    active: true,
  },
];

/* ----------------------- localStorage hook -------------------- */

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  return fallback;
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

const K = {
  products: "msgrdrps_products_v2",
  reviews: "msgrdrps_reviews",
  settings: "msgrdrps_settings",
  convos: "msgrdrps_convos_v2",
  discounts: "msgrdrps_discounts",
  customerId: "msgrdrps_customer_id",
  favorites: "msgrdrps_favorites",
  cart: "msgrdrps_cart",
  compare: "msgrdrps_compare",
  auctions: "msgrdrps_auctions",
  bids: "msgrdrps_bids",
  userCoupons: "msgrdrps_userCoupons",
  userGifts: "msgrdrps_userGifts",
};

/* ------------------------- Account --------------------------- */

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  orderIds: string[];
  points: number;
  fastShipping: boolean;
}

export interface UserCoupon {
  id: string;
  userId: string;
  code: string;
  discountPercent: number;
  description: string;
  used: boolean;
  usedAt?: number;
  orderId?: string;
  createdAt: number;
}

export interface UserGiftClaim {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  claimed: boolean;
  claimedAt?: number;
  orderId?: string;
  createdAt: number;
}

export interface Order {
  id: string;
  items: { productId: string; quantity: number; price: number; name: string; gardropsUrl?: string }[];
  total: number;
  date: number;
  status: "pending" | "paid" | "shipped" | "delivered";
  shippingAddress: { name: string; phone: string; city: string; district: string; address: string };
  couponUsed?: string;
  pointsUsed?: number;
  fastShippingUsed?: boolean;
  giftClaimed?: string;
  gardropsConfirmed?: boolean;
  gardropsConfirmedAt?: number;
}

export interface SpinPrize {
  id: string;
  prize: string;
  label: string;
  date: number;
}

export interface Auction {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  startPrice: number;
  currentPrice: number;
  minIncrement: number;
  startTime: number;
  endTime: number;
  status: "active" | "sold" | "expired" | "cancelled";
  winnerId?: string;
  winnerName?: string;
  soldPrice?: number;
  bidCount: number;
  createdAt: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  amount: number;
  time: number;
  status: "active" | "accepted" | "rejected";
}

/* --------------------------- Context -------------------------- */

interface CartItem {
  productId: string;
  quantity: number;
  giftId?: string;
}

interface StoreCtx {
  products: Product[];
  reviews: Review[];
  settings: Settings;
  conversations: Conversation[];
  discounts: DiscountCode[];
  customerId: string;
  favorites: string[];
  cart: CartItem[];
  // products
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  // reviews
  addReview: (r: Review) => void;
  updateReview: (r: Review) => void;
  removeReview: (id: string) => void;
  // discounts
  addDiscount: (d: DiscountCode) => void;
  updateDiscount: (d: DiscountCode) => void;
  removeDiscount: (id: string) => void;
  // settings
  updateSettings: (s: Settings) => void;
  // messaging
  sendMessage: (
    convoId: string,
    sender: "customer" | "admin" | "system",
    text: string,
    name?: string,
    attachments?: Message["attachments"]
  ) => void;
  markRead: (convoId: string) => void;
  setSeen: (convoId: string, value: boolean) => void;
  toggleBlock: (convoId: string) => void;
  ensureConversation: (id: string, name: string) => void;
  // account
  currentUser: User | null;
  users: User[];
  orders: Order[];
  register: (name: string, email: string, password: string) => User | null;
  login: (email: string, password: string) => User | null;
  logout: () => void;
  placeOrder: (address: Order["shippingAddress"], options?: { total?: number; couponId?: string; pointsUsed?: number; fastShippingUsed?: boolean; giftIds?: string[] }) => string | null;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  updateOrder: (orderId: string, patch: Partial<Order>) => void;
  // favorites & cart
  toggleFavorite: (id: string) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  // comparison
  compareIds: string[];
  toggleCompare: (id: string) => void;
  // spin wheel
  spinPrizes: SpinPrize[];
  spinSlots: { date: string; slots: number[] };
  getCurrentSlot: () => number | null;
  useSlot: () => void;
  addSpinPrize: (p: SpinPrize) => void;
  // coupons / gifts / points
  userCoupons: UserCoupon[];
  userGifts: UserGiftClaim[];
  addUserCoupon: (userId: string, discountPercent: number) => string;
  addUserGift: (userId: string, productId: string, productName: string) => void;
  useCoupon: (couponId: string, orderId: string) => void;
  claimGift: (giftId: string, orderId: string) => void;
  addPoints: (userId: string, amount: number) => void;
  spendPoints: (userId: string, amount: number) => boolean;
  setFastShipping: (userId: string) => void;
  useFastShipping: (userId: string) => void;
  giftProductId: string;
  setGiftProductId: (id: string) => void;
  // auctions
  auctions: Auction[];
  bids: Bid[];
  createAuction: (productId: string, startPrice: number, durationHours: number, minIncrement?: number) => void;
  placeBid: (auctionId: string, amount: number) => boolean;
  acceptBid: (auctionId: string, bidId: string) => void;
  rejectBid: (auctionId: string, bidId: string) => void;
  cancelAuction: (auctionId: string) => void;
  getAuctionBids: (auctionId: string) => Bid[];
  // push notifications
  subscribePush: (userId: string) => Promise<void>;
  notifyUser: (userId: string, title: string, body: string, url?: string) => Promise<void>;
  sendSms: (message: string) => Promise<void>;
  // gardrops reviews
  fetchGardropsReviews: (url: string) => Promise<void>;
  // toasts
  toasts: ToastMsg[];
  addToast: (text: string, type?: ToastMsg["type"]) => void;
  dismissToast: (id: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() =>
    load(K.products, DEFAULT_PRODUCTS)
  );
  const [reviews, setReviews] = useState<Review[]>(() =>
    load(K.reviews, DEFAULT_REVIEWS)
  );
  const [settings, setSettings] = useState<Settings>(() =>
    load(K.settings, DEFAULT_SETTINGS)
  );
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    load(K.convos, [])
  );
  const [discounts, setDiscounts] = useState<DiscountCode[]>(() =>
    load(K.discounts, DEFAULT_DISCOUNTS)
  );
  const [customerId] = useState<string>(() => {
    let id = load<string>(K.customerId, "");
    if (!id) {
      id = "musteri-" + uid();
      save(K.customerId, id);
    }
    return id;
  });
  const [favorites, setFavorites] = useState<string[]>(() => load(K.favorites, []));
  const [compareIds, setCompareIds] = useState<string[]>(() => load(K.compare, []));
  const [cart, setCart] = useState<CartItem[]>(() => load(K.cart, []));
  const [currentUser, setCurrentUser] = useState<User | null>(() => load("currentUser", null));
  const [users, setUsers] = useState<User[]>(() => load("users", []));
  const [orders, setOrders] = useState<Order[]>(() => load("orders", []));
  const [spinPrizes, setSpinPrizes] = useState<SpinPrize[]>(() => load("spinPrizes", []));
  const [spinSlots, setSpinSlots] = useState<{ date: string; slots: number[] }>(() => load("spinSlots", { date: "", slots: [] }));
  const [auctions, setAuctions] = useState<Auction[]>(() => load(K.auctions, []));
  const [bids, setBids] = useState<Bid[]>(() => load(K.bids, []));
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>(() => load(K.userCoupons, []));
  const [userGifts, setUserGifts] = useState<UserGiftClaim[]>(() => load(K.userGifts, []));
  const [giftProductId, setGiftProductId] = useState<string>(() => load("giftProductId", ""));
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const notifyUserRef = useRef<StoreCtx["notifyUser"]>(() => Promise.resolve());
  const [dataLoaded, setDataLoaded] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/db?_t=" + Date.now())
      .then((r) => r.json())
      .then((json) => {
        if (!json.success || !json.data) return;
        const d = json.data;
        if (d.products?.length) setProducts(d.products);
        if (d.reviews?.length) setReviews(d.reviews);
        if (d.settings) setSettings(d.settings);
        if (d.discounts?.length) setDiscounts(d.discounts);
      })
      .catch(() => {})
      .finally(() => setDataLoaded(true));
  }, []);

  const syncToApi = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetch("/api/db?_t=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { products, reviews, settings, discounts },
        }),
      }).catch(() => {});
    }, 2000);
  }, [products, reviews, settings, discounts]);

  useEffect(() => { if (dataLoaded) syncToApi(); }, [products, reviews, settings, discounts, dataLoaded, syncToApi]);

  useEffect(() => save(K.products, products), [products]);
  useEffect(() => save(K.reviews, reviews), [reviews]);
  useEffect(() => save(K.settings, settings), [settings]);
  useEffect(() => save(K.convos, conversations), [conversations]);
  useEffect(() => save(K.discounts, discounts), [discounts]);
  useEffect(() => save(K.favorites, favorites), [favorites]);
  useEffect(() => save(K.compare, compareIds), [compareIds]);
  useEffect(() => save(K.cart, cart), [cart]);
  useEffect(() => save("currentUser", currentUser), [currentUser]);
  useEffect(() => save("users", users), [users]);
  useEffect(() => save("orders", orders), [orders]);
  useEffect(() => save("spinPrizes", spinPrizes), [spinPrizes]);
  useEffect(() => save("spinSlots", spinSlots), [spinSlots]);
  useEffect(() => save(K.auctions, auctions), [auctions]);
  useEffect(() => save(K.bids, bids), [bids]);
  useEffect(() => save(K.userCoupons, userCoupons), [userCoupons]);
  useEffect(() => save(K.userGifts, userGifts), [userGifts]);
  useEffect(() => save("giftProductId", giftProductId), [giftProductId]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === K.convos && e.newValue) setConversations(JSON.parse(e.newValue));
      if (e.key === K.products && e.newValue) setProducts(JSON.parse(e.newValue));
      if (e.key === K.reviews && e.newValue) setReviews(JSON.parse(e.newValue));
      if (e.key === K.settings && e.newValue) setSettings(JSON.parse(e.newValue));
      if (e.key === K.discounts && e.newValue) setDiscounts(JSON.parse(e.newValue));
      if (e.key === K.cart && e.newValue) setCart(JSON.parse(e.newValue));
      if (e.key === K.favorites && e.newValue) setFavorites(JSON.parse(e.newValue));
      if (e.key === K.compare && e.newValue) setCompareIds(JSON.parse(e.newValue));
      if (e.key === K.auctions && e.newValue) setAuctions(JSON.parse(e.newValue));
      if (e.key === K.bids && e.newValue) setBids(JSON.parse(e.newValue));
      if (e.key === K.userCoupons && e.newValue) setUserCoupons(JSON.parse(e.newValue));
      if (e.key === K.userGifts && e.newValue) setUserGifts(JSON.parse(e.newValue));
      if (e.key === "spinSlots" && e.newValue) setSpinSlots(JSON.parse(e.newValue));
      if (e.key === "spinPrizes" && e.newValue) setSpinPrizes(JSON.parse(e.newValue));
      if (e.key === "giftProductId" && e.newValue) setGiftProductId(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setAuctions((prev) =>
        prev.map((a) =>
          a.status === "active" && now > a.endTime ? { ...a, status: "expired" as const } : a
        )
      );
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const addProduct = (p: Product) => setProducts((prev) => [p, ...prev]);
  const updateProduct = (p: Product) =>
    setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const removeProduct = (id: string) =>
    setProducts((prev) => prev.filter((x) => x.id !== id));

  const addReview = (r: Review) => setReviews((prev) => [r, ...prev]);
  const updateReview = (r: Review) =>
    setReviews((prev) => prev.map((x) => (x.id === r.id ? r : x)));
  const removeReview = (id: string) =>
    setReviews((prev) => prev.filter((x) => x.id !== id));

  const addDiscount = (d: DiscountCode) => setDiscounts((prev) => [...prev, d]);
  const updateDiscount = (d: DiscountCode) =>
    setDiscounts((prev) => prev.map((x) => (x.id === d.id ? d : x)));
  const removeDiscount = (id: string) =>
    setDiscounts((prev) => prev.filter((x) => x.id !== id));

  const updateSettings = (s: Settings) => setSettings(s);

  const ensureConversation = (id: string, name: string) => {
    setConversations((prev) => {
      if (prev.some((c) => c.id === id)) return prev;
      const welcome: Message = {
        id: uid(),
        sender: "system",
        text: settings.autoWelcome,
        time: Date.now(),
      };
      return [
        {
          id,
          name,
          messages: [welcome],
          unreadByAdmin: 0,
          lastActive: Date.now(),
          blocked: false,
          seenByAdmin: true,
        },
        ...prev,
      ];
    });
  };

  const sendMessage: StoreCtx["sendMessage"] = (
    convoId,
    sender,
    text,
    name,
    attachments
  ) => {
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === convoId);
      const msg: Message = {
        id: uid(),
        sender,
        text,
        attachments: attachments || [],
        time: Date.now(),
      };
      if (!exists) {
        const welcome: Message = {
          id: uid(),
          sender: "system",
          text: settings.autoWelcome,
          time: Date.now() - 1,
        };
        return [
          {
            id: convoId,
            name: name || "Müşteri",
            messages: [welcome, msg],
            unreadByAdmin: sender === "customer" ? 1 : 0,
            lastActive: Date.now(),
            blocked: false,
            seenByAdmin: sender !== "customer",
          },
          ...prev,
        ];
      }
      if (exists.blocked && sender === "customer") {
        return prev;
      }
      return prev.map((c) =>
        c.id === convoId
          ? {
              ...c,
              name: name || c.name,
              messages: [...c.messages, msg],
              unreadByAdmin:
                sender === "customer" ? c.unreadByAdmin + 1 : c.unreadByAdmin,
              lastActive: Date.now(),
              seenByAdmin: sender !== "customer" ? c.seenByAdmin : false,
            }
          : c
      );
    });
    if (sender === "customer") {
      const preview = text.slice(0, 80) || "Yeni bir mesaj var";
      setTimeout(() => notifyUserRef.current("admin", "MSgrdrps - Yeni Mesaj", preview, "/admin"), 100);
      setTimeout(() => sendSms(`${name || "Müşteri"}: ${preview}`), 200);
    }
  };

  const markRead = (convoId: string) =>
    setConversations((prev) =>
      prev.map((c) => (c.id === convoId ? { ...c, unreadByAdmin: 0, seenByAdmin: true } : c))
    );

  const setSeen = (convoId: string, value: boolean) =>
    setConversations((prev) =>
      prev.map((c) => (c.id === convoId ? { ...c, seenByAdmin: value, unreadByAdmin: value ? 0 : c.unreadByAdmin } : c))
    );

  const toggleBlock = (convoId: string) =>
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convoId
          ? {
              ...c,
              blocked: !c.blocked,
              messages: [
                ...c.messages,
                {
                  id: uid(),
                  sender: "system",
                  text: !c.blocked
                    ? "Müşteri engellendi — bu müşteri artık mesaj gönderemez."
                    : "Müşteri engeli kaldırıldı.",
                  time: Date.now(),
                },
              ],
            }
          : c
      )
    );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      addToast(exists ? "Beğenilerden kaldırıldı" : "Beğenilere eklendi", exists ? "info" : "success");
      return exists ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
    addToast("Karşılaştırmaya eklendi", "info");
  };

  const addSpinPrize = (p: SpinPrize) => setSpinPrizes((prev) => [p, ...prev]);

  const getCurrentSlot = (): number | null => {
    const h = new Date().getHours();
    if (h >= 10 && h < 13) return 0;
    if (h >= 13 && h < 20) return 1;
    if (h >= 20) return 2;
    return null;
  };

  const useSlot = () => {
    const slot = getCurrentSlot();
    if (slot === null) return;
    const today = new Date().toDateString();
    setSpinSlots((prev) => {
      if (prev.date !== today) return { date: today, slots: [slot] };
      if (prev.slots.includes(slot)) return prev;
      return { ...prev, slots: [...prev.slots, slot] };
    });
  };

  const addUserCoupon = (userId: string, discountPercent: number): string => {
    const code = "CW" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const coupon: UserCoupon = {
      id: uid(),
      userId,
      code,
      discountPercent,
      description: `Çark ödülü: %${discountPercent} indirim`,
      used: false,
      createdAt: Date.now(),
    };
    setUserCoupons((prev) => [...prev, coupon]);
    return code;
  };

  const addUserGift = (userId: string, productId: string, productName: string) => {
    const gift: UserGiftClaim = {
      id: uid(),
      userId,
      productId,
      productName,
      claimed: false,
      createdAt: Date.now(),
    };
    setUserGifts((prev) => [...prev, gift]);
  };

  const useCoupon = (couponId: string, orderId: string) => {
    setUserCoupons((prev) =>
      prev.map((c) => (c.id === couponId ? { ...c, used: true, usedAt: Date.now(), orderId } : c))
    );
  };

  const claimGift = (giftId: string, orderId: string) => {
    setUserGifts((prev) =>
      prev.map((g) => (g.id === giftId ? { ...g, claimed: true, claimedAt: Date.now(), orderId } : g))
    );
  };

  const addPoints = (userId: string, amount: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, points: (u.points || 0) + amount } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => prev ? { ...prev, points: (prev.points || 0) + amount } : prev);
    }
  };

  const spendPoints = (userId: string, amount: number): boolean => {
    const user = users.find((u) => u.id === userId);
    if (!user || (user.points || 0) < amount) return false;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, points: (u.points || 0) - amount } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => prev ? { ...prev, points: (prev.points || 0) - amount } : prev);
    }
    return true;
  };

  const setFastShipping = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, fastShipping: true } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => prev ? { ...prev, fastShipping: true } : prev);
    }
  };

  const subscribePush = async (userId: string) => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
    try {
      if (Notification.permission === "denied") return;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BPdJDzUrtfItf1MCf4yb9ykYUs1xRfclwUbs3NdWh6-6RfMYrdIH3-oFmK2keE1eBT0NxN71gHrUJr9ibSXjQD4",
      });
      await apiFetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscription }),
      });
      localStorage.setItem("pushSubscribed", userId);
    } catch {}
  };

  const notifyUser = async (userId: string, title: string, body: string, url?: string) => {
    try {
      await apiFetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title, body, url }),
      });
    } catch {}
  };
  notifyUserRef.current = notifyUser;

  const sendSms = async (message: string) => {
    if (!settings.adminPhone || !settings.smsEnabled) return;
    try {
      await apiFetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: settings.adminPhone,
          message,
          usercode: settings.smsUserCode,
          password: settings.smsPassword,
          header: settings.smsHeader || "MSGrdrps",
        }),
      });
    } catch {}
  };

  const fetchGardropsReviews = async (url: string) => {
    try {
      const res = await apiFetch("/api/fetch-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (json.success && json.data?.length) {
        setReviews((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newOnes = json.data.filter((r: Review) => !existingIds.has(r.id));
          return [...newOnes, ...prev];
        });
        addToast(`${json.data.length} yorum Gardrops'tan çekildi`, "success");
      } else {
        addToast("Yorum bulunamadı", "info");
      }
    } catch {
      addToast("Yorum çekilemedi", "error");
    }
  };

  const useFastShipping = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, fastShipping: false } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => prev ? { ...prev, fastShipping: false } : prev);
    }
  };

  const createAuction = (productId: string, startPrice: number, durationHours: number, minIncrement = 10) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const now = Date.now();
    const auction: Auction = {
      id: uid(),
      productId,
      productName: product.name,
      productImage: product.images[0] || "",
      startPrice,
      currentPrice: startPrice,
      minIncrement,
      startTime: now,
      endTime: now + durationHours * 3600000,
      status: "active",
      bidCount: 0,
      createdAt: now,
    };
    setAuctions((prev) => [auction, ...prev]);
    addToast("Açık artırma oluşturuldu", "success");
  };

  const placeBid = (auctionId: string, amount: number): boolean => {
    if (!currentUser) return false;
    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction || auction.status !== "active" || Date.now() > auction.endTime) return false;
    if (amount < auction.currentPrice + auction.minIncrement) return false;
    const bid: Bid = {
      id: uid(),
      auctionId,
      userId: currentUser.id,
      userName: currentUser.name,
      amount,
      time: Date.now(),
      status: "active",
    };
    setBids((prev) => [...prev, bid]);
    setAuctions((prev) =>
      prev.map((a) =>
        a.id === auctionId
          ? { ...a, currentPrice: amount, bidCount: a.bidCount + 1 }
          : a
      )
    );
    addToast("Teklif verildi: ₺" + amount, "success");
    return true;
  };

  const acceptBid = (auctionId: string, bidId: string) => {
    let foundBid: Bid | undefined;
    setBids((prev) => {
      const next = prev.map((b) =>
        b.id === bidId ? { ...b, status: "accepted" as const } : b
      );
      foundBid = next.find((b) => b.id === bidId);
      return next;
    });
    setAuctions((prev) =>
      prev.map((a) =>
        a.id === auctionId
          ? {
              ...a,
              status: "sold" as const,
              winnerId: foundBid?.userId,
              winnerName: foundBid?.userName,
              soldPrice: foundBid?.amount,
            }
          : a
      )
    );
    addToast("Teklif kabul edildi — ürün satıldı", "success");
  };

  const rejectBid = (_auctionId: string, bidId: string) => {
    setBids((prev) =>
      prev.map((b) =>
        b.id === bidId ? { ...b, status: "rejected" as const } : b
      )
    );
    addToast("Teklif reddedildi", "info");
  };

  const cancelAuction = (auctionId: string) => {
    setAuctions((prev) =>
      prev.map((a) => (a.id === auctionId ? { ...a, status: "cancelled" as const } : a))
    );
    addToast("Açık artırma iptal edildi", "info");
  };

  const getAuctionBids = (auctionId: string) =>
    bids.filter((b) => b.auctionId === auctionId).sort((a, b) => b.amount - a.amount);

  const addToast = (text: string, type: ToastMsg["type"] = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  };
  const dismissToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.productId === item.productId);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + item.quantity);
        if (newQty === 0) {
          addToast("Sepetten çıkarıldı", "info");
          return prev.filter((x) => x.productId !== item.productId);
        }
        return prev.map((x) =>
          x.productId === item.productId
            ? { ...x, quantity: newQty, giftId: item.giftId || x.giftId }
            : x
        );
      }
      return [...prev, item];
    });
    if (item.quantity > 0) addToast("Sepete eklendi", "success");
  };

  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((x) => x.productId !== id));

  const clearCart = () => setCart([]);

  const register = (name: string, email: string, password: string): User | null => {
    if (users.find((u) => u.email === email)) return null;
    const user: User = { id: uid(), name, email, password, orderIds: [], points: 0, fastShipping: false };
    setUsers((prev) => [...prev, user]);
    setCurrentUser(user);
    return user;
  };

  const login = (email: string, password: string): User | null => {
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) return null;
    setCurrentUser(user);
    return user;
  };

  const logout = () => setCurrentUser(null);

  const decrementStock = (productId: string, qty: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, stock: Math.max(0, p.stock - qty) } : p
      )
    );
  };

  const updateOrderStatus = (orderId: string, status: Order["status"]) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    addToast("Sipariş durumu güncellendi", "success");
  };

  const updateOrder = (orderId: string, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
    addToast("Sipariş güncellendi", "success");
  };

  const placeOrder = (address: Order["shippingAddress"], options?: { total?: number; couponId?: string; pointsUsed?: number; fastShippingUsed?: boolean; giftIds?: string[] }): string | null => {
    if (!currentUser || cart.length === 0) return null;
    const items: Order["items"] = [];
    for (const ci of cart) {
      const p = products.find((x) => x.id === ci.productId);
      if (!p || p.stock < ci.quantity) {
        addToast(p ? `"${p.name}" stokta yetersiz (kalan: ${p.stock})` : "Ürün bulunamadı", "error");
        return null;
      }
      const gardropsUrl = p.gardropsUrl || undefined;
      items.push({ productId: ci.productId, quantity: ci.quantity, price: p.priceNum, name: p.name, gardropsUrl });
    }
    for (const ci of cart) {
      decrementStock(ci.productId, ci.quantity);
    }
    const total = options?.total ?? items.reduce((s, i) => s + i.price * i.quantity, 0);
    const order: Order = {
      id: uid(), items, total, date: Date.now(), status: "pending", shippingAddress: address,
      couponUsed: options?.couponId,
      pointsUsed: options?.pointsUsed,
      fastShippingUsed: options?.fastShippingUsed,
      giftClaimed: options?.giftIds?.length ? options.giftIds.join(", ") : undefined,
      gardropsConfirmed: false,
    };
    setOrders((prev) => [...prev, order]);
    setCurrentUser((prev) => prev ? { ...prev, orderIds: [...prev.orderIds, order.id] } : prev);
    setUsers((prev) => prev.map((u) => u.id === currentUser.id ? { ...u, orderIds: [...u.orderIds, order.id] } : u));
    if (options?.couponId) useCoupon(options.couponId, order.id);
    if (options?.pointsUsed && options.pointsUsed > 0) spendPoints(currentUser.id, options.pointsUsed);
    if (options?.fastShippingUsed) useFastShipping(currentUser.id);
    if (options?.giftIds) options.giftIds.forEach((gid) => claimGift(gid, order.id));
    setCart([]);
    addToast("Sipariş alındı! 🎉", "success");
    return order.id;
  };

  return (
    <Ctx.Provider
      value={{
        products,
        reviews,
        settings,
        conversations,
        discounts,
        customerId,
        favorites,
        cart,
        currentUser,
        users,
        orders,
        register,
        login,
        logout,
        placeOrder,
        addProduct,
        updateProduct,
        removeProduct,
        addReview,
        updateReview,
        removeReview,
        addDiscount,
        updateDiscount,
        removeDiscount,
        updateSettings,
        sendMessage,
        markRead,
        setSeen,
        toggleBlock,
        ensureConversation,
        toggleFavorite,
        toggleCompare,
        compareIds,
        addSpinPrize,
        spinPrizes,
        spinSlots,
        getCurrentSlot,
        useSlot,
        userCoupons,
        userGifts,
        addUserCoupon,
        addUserGift,
        useCoupon,
        claimGift,
        addPoints,
        spendPoints,
        setFastShipping,
        useFastShipping,
        giftProductId,
        setGiftProductId,
        auctions,
        bids,
        createAuction,
        placeBid,
        acceptBid,
        rejectBid,
        cancelAuction,
        getAuctionBids,
        subscribePush,
        notifyUser,
        sendSms,
        fetchGardropsReviews,
        toasts,
        addToast,
        dismissToast,
        addToCart,
        removeFromCart,
        clearCart,
        updateOrderStatus,
        updateOrder,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { uid, GARDROPS_DEFAULT };
