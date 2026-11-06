/* ==========================================================================
   main.jsx — the one entry point. Styles are the same two files the HTML
   version linked, imported so Vite ships them; the avatar pool is handed to
   the shared avatar builder as bundled urls.
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
import InviteNotice from "./components/InviteNotice.jsx";

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
    <InviteNotice />
    <App />
  </HashRouter>
);
