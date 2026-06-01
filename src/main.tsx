import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initScrollReveal } from "./scrollReveal";

if ("serviceWorker" in navigator && !location.hostname.includes("localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

window.addEventListener("load", initScrollReveal);
window.addEventListener("popstate", initScrollReveal);

createRoot(document.getElementById("root")!).render(<App />);
