import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initScrollReveal } from "./scrollReveal";

// Only register SW in production (served by Express, not Vite dev server)
if ("serviceWorker" in navigator && !location.hostname.includes("localhost") && !location.port) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

window.addEventListener("load", initScrollReveal);
window.addEventListener("popstate", initScrollReveal);

createRoot(document.getElementById("root")!).render(<App />);
