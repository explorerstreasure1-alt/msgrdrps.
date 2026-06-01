import { useEffect } from "react";

export interface ToastMsg {
  id: string;
  text: string;
  type: "success" | "info" | "error";
}

export function Toast({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  const icon = msg.type === "success" ? "✓" : msg.type === "error" ? "✕" : "ℹ";
  const bg =
    msg.type === "success"
      ? "bg-emerald-600"
      : msg.type === "error"
        ? "bg-rose-600"
        : "bg-stone-700";

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${bg} animate-slideUp`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
        {icon}
      </span>
      {msg.text}
    </div>
  );
}
