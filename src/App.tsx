import { useState, useEffect } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";
import Home from "./components/Home";
import Admin from "./components/Admin";

function PushSubscriber() {
  const { currentUser, subscribePush } = useStore();
  useEffect(() => {
    if (currentUser && !localStorage.getItem("pushSubscribed")) {
      subscribePush(currentUser.id);
    }
  }, [currentUser]);
  return null;
}

export default function App() {
  const [route, setRoute] = useState<"home" | "admin">("home");

  const go = (r: "home" | "admin") => {
    setRoute(r);
    window.scrollTo(0, 0);
  };

  return (
    <StoreProvider>
      <PwaUpdatePrompt />
      <PushSubscriber />
      {route === "admin" ? (
        <Admin onExit={() => go("home")} />
      ) : (
        <Home onAdmin={() => go("admin")} />
      )}
    </StoreProvider>
  );
}
