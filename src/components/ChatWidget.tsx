import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import logoSrc from "../logo-admin.png";

function MessageText({ text }: { text: string }) {
  // turn urls into links
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <span className="whitespace-pre-line break-words">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-amber-800 underline underline-offset-2"
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

export default function ChatWidget() {
  const { customerId, conversations, sendMessage, ensureConversation } =
    useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(() =>
    localStorage.getItem("msgrdrps_customer_name") || ""
  );
  const [nameSet, setNameSet] = useState(() =>
    Boolean(localStorage.getItem("msgrdrps_customer_name"))
  );
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const convo = conversations.find((c) => c.id === customerId);

  useEffect(() => {
    if (open && nameSet) {
      ensureConversation(customerId, name || "Müşteri");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nameSet]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convo?.messages.length, open]);

  const startChat = () => {
    if (!name.trim()) return;
    localStorage.setItem("msgrdrps_customer_name", name.trim());
    setNameSet(true);
    ensureConversation(customerId, name.trim());
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(customerId, "customer", input.trim(), name || "Müşteri");
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-stone-800 text-stone-50 shadow-lg shadow-stone-900/30 transition hover:scale-105 hover:bg-stone-700"
        aria-label="Mesajlaşma"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fdfaf4] shadow-2xl shadow-stone-900/20">
          {/* Header */}
          <div className="flex items-center gap-3 bg-stone-800 px-4 py-3 text-stone-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efe5d4]">
              <img
                src={logoSrc}
                alt="MS"
                className="h-7 w-7 rounded-full object-cover"
              />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">MS Canlı Destek</p>
              <p className="text-[11px] text-stone-300">Genellikle hemen yanıtlar</p>
            </div>
          </div>

          {!nameSet ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-sm text-stone-600">
                Sohbete başlamak için adınızı yazın 🤎
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startChat()}
                placeholder="Adınız Soyadınız"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
              />
              <button
                onClick={startChat}
                className="w-full rounded-lg bg-stone-800 py-2 text-sm font-medium text-stone-50 hover:bg-stone-700"
              >
                Sohbete Başla
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {convo?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.sender === "customer"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm " +
                        (m.sender === "customer"
                          ? "rounded-br-sm bg-stone-800 text-stone-50"
                          : m.sender === "system"
                          ? "rounded-bl-sm border border-amber-200 bg-amber-50 text-stone-700"
                          : "rounded-bl-sm bg-white text-stone-800 shadow-sm")
                      }
                    >
                      <MessageText text={m.text} />
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex items-center gap-2 border-t border-stone-200 p-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Mesaj yazın..."
                  className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm outline-none focus:border-stone-500"
                />
                <button
                  onClick={handleSend}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-stone-50 hover:bg-stone-700"
                  aria-label="Gönder"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
