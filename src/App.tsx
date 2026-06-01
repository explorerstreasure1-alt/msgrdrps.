import { useState } from "react";
import { StoreProvider } from "./lib/store";
import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import Home from "./components/Home";
import Admin from "./components/Admin";

export default function App() {
  const [route, setRoute] = useState<"home" | "admin">("home");

  const go = (r: "home" | "admin") => {
    setRoute(r);
    window.scrollTo(0, 0);
  };

  return (
    <StoreProvider>
      <PwaUpdatePrompt />
      {route === "admin" ? (
        <Admin onExit={() => go("home")} />
      ) : (
        <Home onAdmin={() => go("admin")} />
      )}
    </StoreProvider>
  );
}
