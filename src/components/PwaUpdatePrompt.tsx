import { useEffect, useState } from "react";

export function PwaUpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      setWaiting(null);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        setWaiting(reg.waiting);
      }

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (installing) {
          installing.addEventListener("statechange", () => {
            if (reg.waiting) setWaiting(reg.waiting);
          });
        }
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 bg-stone-800 px-4 py-3 text-sm text-white shadow-lg">
      <span>Yeni sürüm mevcut — güncellemek için dokunun</span>
      <button
        onClick={() => waiting.postMessage("SKIP_WAITING")}
        className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100"
      >
        Güncelle
      </button>
    </div>
  );
}
