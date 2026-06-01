import { useState } from "react";
import { useStore, type Order } from "../lib/store";

export default function AccountPanel({ onClose }: { onClose: () => void }) {
  const { register, login, logout, placeOrder, currentUser, orders, cart } = useStore();
  const [mode, setMode] = useState<"login" | "register">(currentUser ? "login" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const userOrders = orders.filter((o) => currentUser?.orderIds.includes(o.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register") {
      if (!name || !email || !password) { setError("Tüm alanları doldurun."); return; }
      const u = register(name, email, password);
      if (!u) { setError("Bu e-posta zaten kayıtlı."); return; }
      setError("");
    } else {
      const u = login(email, password);
      if (!u) { setError("E-posta veya şifre hatalı."); return; }
      setError("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-20 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-stone-400 hover:text-stone-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        {!currentUser ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-elegant text-2xl text-stone-800">{mode === "login" ? "Giriş Yap" : "Kayıt Ol"}</h2>
            {mode === "register" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adın Soyadın" className="inp w-full" />
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" type="email" className="inp w-full" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" type="password" className="inp w-full" />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" className="w-full rounded-full bg-stone-800 py-3 text-sm font-semibold text-white hover:bg-stone-700">
              {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </button>
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="w-full text-center text-xs text-stone-500 underline">
              {mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-elegant text-2xl text-stone-800">Hesabım</h2>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">{currentUser.name}</span>
            </div>

            {cart.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">Sepetinde {cart.length} ürün var</p>
                <button onClick={() => { placeOrder(); alert("Sipariş alındı!"); }} className="mt-2 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                  Siparişi Tamamla
                </button>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-stone-700">Sipariş Geçmişi</p>
              {userOrders.length === 0 ? (
                <p className="mt-2 text-xs text-stone-400">Henüz siparişin yok.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {userOrders.map((o) => (
                    <div key={o.id} className="rounded-xl border border-stone-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-700">{new Date(o.date).toLocaleDateString("tr-TR")}</span>
                        <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold text-white " + (o.status === "pending" ? "bg-amber-500" : o.status === "paid" ? "bg-blue-500" : o.status === "shipped" ? "bg-emerald-500" : "bg-stone-500")}>
                          {o.status === "pending" ? "Bekliyor" : o.status === "paid" ? "Ödendi" : o.status === "shipped" ? "Kargoda" : "Teslim Edildi"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">{o.items.length} ürün · ₺{o.total}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => logout()} className="w-full rounded-full border border-red-200 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
