/* ==========================================================================
   main.jsx — admin panel entry point. Only renders the admin panel.
   ========================================================================== */
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./styles/ui.css";
import "./styles/app.css";
import "./styles/mount.css";
import UI from "./lib/ui.js";
import Store from "./lib/store.js";
import { initSync } from "./lib/firestore-sync.js";
import App from "./App.jsx";

/* Initialize Firestore sync — loads data from Firestore into localStorage
   and keeps them in sync. Safe to call even if Firebase config is missing
   (will log a warning and skip sync). */
initSync();

const pool = import.meta.glob("./assets/avatars/*.jpg", { eager: true, query: "?url", import: "default" });
const map = {};
Object.keys(pool).forEach(function (p) { map[p.split("/").pop()] = pool[p]; });
UI.setAvatarMap(map);
UI.blockZoom();

createRoot(document.getElementById("root")).render(
  <HashRouter>
    <App />
  </HashRouter>
);
