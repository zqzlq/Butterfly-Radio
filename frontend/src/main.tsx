import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker (handles audio bypass for range requests)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    // Unregister any stale service workers first
    for (const reg of registrations) {
      if (reg.active && !reg.active.scriptURL.includes("sw.js")) {
        reg.unregister();
      }
    }
  });
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
