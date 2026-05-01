import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker (bypasses cache for audio range requests)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    // Unregister any stale service workers that may cache 206 responses
    for (const reg of registrations) {
      if (reg.active) {
        reg.unregister();
      }
    }
  });
  // Re-register our clean service worker
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
