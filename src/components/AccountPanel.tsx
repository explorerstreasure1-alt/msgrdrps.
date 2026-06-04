import { useState } from "react";
import { useStore } from "../lib/store";

export default function AccountPanel({ onClose }: { onClose: () => void }) {
  const { register, login, logout, currentUser, subscribePush } = useStore();
  const [mode, setMode] = useState<"login" | "register">(currentUser ? "login" : "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register") {
      if (!name || !email || !password) { setError("Tüm alanları doldurun."); return; }
      const u = register(name, email, password);
      if (!u) { setError("Bu e-posta zaten kayıtlı."); return; }
      setError("");
      subscribePush(u.id);
    } else {
      const u = login(email, password);
      if (!u) { setError("E-posta veya şifre hatalı."); return; }
      setError("");
      subscribePush(u.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-10 sm:pt-20 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-[#FDFBF7] p-8 shadow-[0_20px_50px_rgba(15,15,15,0.08)] mx-4">
        <button onClick={onClose} className="absolute right-4 top-4 text-stone-300 hover:text-stone-800 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        {!currentUser ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center">
              <h2 className="font-elegant text-2xl text-stone-800">{mode === "login" ? "Giriş Yap" : "Kayıt Ol"}</h2>
              <p className="mt-1 text-xs text-stone-400">
                {mode === "login" ? "Hesabına giriş yap" : "Yeni hesap oluştur"}
              </p>
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Adın Soyadın</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adın Soyadın"
                  className="w-full rounded-xl border border-[#E5E1DA] bg-[#F9F8F6] px-4 py-2.5 text-sm outline-none transition focus:border-[#1A1A1A]" />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">E-posta</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta adresin" type="email"
                className="w-full rounded-xl border border-[#E5E1DA] bg-[#F9F8F6] px-4 py-2.5 text-sm outline-none transition focus:border-[#1A1A1A]" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Şifre</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password"
                className="w-full rounded-xl border border-[#E5E1DA] bg-[#F9F8F6] px-4 py-2.5 text-sm outline-none transition focus:border-[#1A1A1A]" />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button type="submit"
              className="w-full rounded-xl bg-[#111111] py-3 text-sm font-semibold text-white uppercase tracking-[0.15em] transition-all duration-300 hover:bg-[#2C2623] active:scale-[0.98]">
              {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </button>

            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="w-full text-center text-xs text-stone-400 hover:text-stone-600 transition-colors">
              {mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-elegant text-2xl text-stone-800">Hesabım</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">{currentUser.name}</span>
            </div>
            <button onClick={() => logout()}
              className="w-full rounded-xl border border-stone-200 py-2.5 text-xs font-medium text-stone-500 hover:border-red-200 hover:text-red-600 transition-colors">
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
