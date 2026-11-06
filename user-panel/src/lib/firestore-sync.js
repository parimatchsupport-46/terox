/* ==========================================================================
   firestore-sync.js — Bridges localStorage-based Store with Firestore.

   How it works:
   1. On init: loads all data from Firestore → localStorage (Store picks it up)
   2. Listens for Firestore changes → updates localStorage → dispatches terox:change
   3. Listens for terox:change events → debounced sync to Firestore

   The Store (store.js) never needs to change — it still uses localStorage.
   This module just keeps localStorage in sync with Firestore.

   Data keys synced:
     terox.users.v1, terox.chats.v1, terox.profile.v1,
     terox.prefs.v1, terox.payreq.v1
   ========================================================================== */
import { db, collection, doc, getDocs, setDoc, onSnapshot } from "./firebase.js";

const KEYS = [
  "terox.chats.v1",
  "terox.profile.v1",
  "terox.prefs.v1",
  "terox.users.v1",
  "terox.payreq.v1"
];

let _initialized = false;
let _syncing = false;       // prevents loops: Firestore → localStorage → Firestore
let _debounceTimer = null;  // debounce localStorage → Firestore sync

/* Load all data from Firestore into localStorage */
async function loadFromFirestore() {
  try {
    const snap = await getDocs(collection(db, "data"));
    snap.forEach(function (d) {
      if (!KEYS.includes(d.id)) return;
      const val = d.data().value;
      localStorage.setItem(d.id, JSON.stringify(val));
    });
    window.dispatchEvent(new CustomEvent("terox:change", { detail: { remote: true } }));
    console.log("[Terox] Firestore sync: loaded", snap.size, "documents");
  } catch (e) {
    console.warn("[Terox] Firestore load failed:", e.message || e);
  }
}

/* Debounced sync: push localStorage → Firestore */
function syncToFirestore(event) {
  if (_syncing || event?.detail?.remote) return;
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(function () {
    _debounceTimer = null;
    _syncing = true;
    var promises = [];
    KEYS.forEach(function (key) {
      var val = localStorage.getItem(key);
      if (val === null || key === "terox.users.v1") return;
      promises.push(
        setDoc(doc(db, "data", key), { value: JSON.parse(val) })
          .catch(function (e) { console.warn("[Terox] Firestore sync failed for", key, ":", e.message || e); })
      );
    });
    Promise.all(promises).then(function () {
      _syncing = false;
    }).catch(function () {
      _syncing = false;
    });
  }, 500);
}

/* Listen for Firestore changes → update localStorage */
function listenToFirestore() {
  onSnapshot(collection(db, "data"), function (snap) {
    if (_syncing) return;
    _syncing = true;
    snap.forEach(function (d) {
      if (!KEYS.includes(d.id)) return;
      const val = d.data().value;
      localStorage.setItem(d.id, JSON.stringify(val));
    });
    window.dispatchEvent(new CustomEvent("terox:change", { detail: { remote: true } }));
    _syncing = false;
  }, function (err) {
    console.warn("[Terox] Firestore listener error:", err.message || err);
    _syncing = false;
  });
}

/* Initialize sync */
export function initSync() {
  if (_initialized) return;
  _initialized = true;

  // Load from Firestore first
  loadFromFirestore();

  // Listen for Firestore changes
  listenToFirestore();

  // Listen for localStorage changes → sync to Firestore
  window.addEventListener("terox:change", syncToFirestore);
}

export default { initSync };
