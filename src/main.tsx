import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initScrollReveal } from "./scrollReveal";

// Nuke any stale service worker immediately — old caches cause 404 white-screen
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
  caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
}

// Only register SW in production (Express server, no port)
if ("serviceWorker" in navigator && !location.hostname.includes("localhost") && !location.port) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

window.addEventListener("load", initScrollReveal);
window.addEventListener("popstate", initScrollReveal);

createRoot(document.getElementById("root")!).render(<App />);
