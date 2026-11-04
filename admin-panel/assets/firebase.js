/* ==========================================================================
   firebase.js — optional cloud layer for Terox Chat.

   Nothing here is required: with no config the app and the admin panel run on
   localStorage exactly as before. The moment a web config exists (committed as
   assets/firebase-config.js, or pasted into the admin panel's Firebase dialog)
   the roster moves to Firestore and profile images go to Storage, so an admin
   on Vercel and a phone opening the app see the same users.

   The SDK is pulled as ESM from the pinned CDN at runtime — no build step.
   ========================================================================== */
(function (global) {
  "use strict";

  var VERSION = "11.1.0";
  var CDN = "https://www.gstatic.com/firebasejs/" + VERSION + "/";
  var ROSTER = "teroxUsers";
  var PHOTO_DIR = "avatars/";
  var MAX_BYTES = 8 * 1024 * 1024;
  var TYPES = ["image/jpeg", "image/png", "image/webp"];
  var KEY = "terox.firebase.v1";

  var mods = {};             /* firebase-app / -firestore / -storage / -auth */
  var app = null, db = null, store = null, auth = null;
  var state = "off";         /* off | connecting | ready | error */
  var why = "";
  var unsub = null, authUser = null;
  var listeners = [];

  /* ---------------- config ---------------- */
  function readKey() {
    try { return JSON.parse(global.localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function usable(c) {
    if (!c) return null;
    if (typeof c === "string") { try { c = JSON.parse(c); } catch (e) { return null; } }
    return c.projectId && c.apiKey ? c : null;
  }
  /* the committed config file wins only when it is actually filled in, so an
     empty placeholder never hides a config saved from the admin panel */
  function config() {
    return usable(global.TEROX_FIREBASE) || usable(readKey());
  }
  function setConfig(c) {
    try { global.localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    global.TEROX_FIREBASE = c;
    state = "off"; why = "";
    return c;
  }
  function clearConfig() {
    try { global.localStorage.removeItem(KEY); } catch (e) {}
    global.TEROX_FIREBASE = null;
    state = "off"; why = "";
    if (unsub) { unsub(); unsub = null; }
    return null;
  }
  /* a config as typed in the Firebase console (may be JS, not JSON) */
  function parseSnippet(text) {
    var out = {};
    String(text).replace(/([A-Za-z][A-Za-z0-9_]*)\s*:\s*["']([^"']*)["']/g, function (_, k, v) {
      out[k] = v;
      return "";
    });
    var needed = ["apiKey", "authDomain", "projectId"];
    var missing = needed.filter(function (k) { return !out[k]; });
    if (missing.length) return { error: "missing " + missing.join(", ") };
    if (!out.storageBucket) out.storageBucket = out.projectId + ".appspot.com";
    return { config: out };
  }
  function configFile(c) {
    return "/* paste-ready: the app and the admin panel both read this file */\n" +
      "window.TEROX_FIREBASE = " + JSON.stringify(c, null, 2) + ";\n";
  }

  /* ---------------- connect ---------------- */
  function say(next, reason) {
    state = next; why = reason || "";
    fire();
    return state;
  }
  function fire() {
    listeners.forEach(function (fn) { try { fn(state, why, authUser); } catch (e) {} });
  }
  function on(cb) { listeners.push(cb); cb(state, why, authUser); return function () { listeners = listeners.filter(function (f) { return f !== cb; }); }; }

  /* the pages load us as a classic script, so the ESM import has to be built at
     runtime - a literal import() there is a parse error outside a module */
  var dynamicImport = new Function("u", "return import(u)");
  function importModule(name) {
    if (!global.document) return Promise.reject(new Error("no document"));
    if (!global.HTMLScriptElement || !document.createElement) return Promise.reject(new Error("no dom"));
    var el = global.document.createElement("link");
    el.rel = "modulepreload";
    el.href = CDN + name + ".js";
    global.document.head.appendChild(el);
    return dynamicImport(CDN + name + ".js").catch(function (e) { throw new Error(name + ": " + (e.message || e)); });
  }

  function connect(force) {
    if (state === "ready" && !force) return Promise.resolve(state);
    if (state === "connecting") return connecting;
    var c = config();
    if (!c) { say("off", "no web config"); return Promise.resolve("off"); }
    if (!global.document || !global.window) {
      return Promise.resolve(say("error", "this browser cannot load the Firebase modules — running on this device only"));
    }
    say("connecting");
    connecting = Promise.all([
      importModule("firebase-app"), importModule("firebase-firestore"),
      importModule("firebase-storage"), importModule("firebase-auth")
    ]).then(function (m) {
      mods = { app: m[0], firestore: m[1], storage: m[2], auth: m[3] };
      app = mods.app.initializeApp(c);
      db = mods.firestore.getFirestore(app);
      store = mods.storage.getStorage(app);
      auth = mods.auth.getAuth(app);
      mods.auth.onAuthStateChanged(auth, function (u) { authUser = u; fire(); });
      say("ready");
      return "ready";
    }).catch(function (e) {
      return say("error", "could not reach Firebase (" + (e.message || e) + ") — running on this device only");
    });
    return connecting;
  }
  var connecting = null;

  /* ---------------- auth ---------------- */
  function signIn(email, password) {
    if (state !== "ready") return Promise.reject(new Error("Firebase is not connected"));
    return mods.auth.signInWithEmailAndPassword(auth, email.trim(), password).then(function (r) {
      authUser = r.user; fire(); return r.user;
    });
  }
  function signOut() {
    if (state !== "ready") return Promise.resolve();
    return mods.auth.signOut().then(function () { authUser = null; fire(); });
  }
  function signedIn() { return authUser || null; }

  /* ---------------- images ---------------- */
  /* shrink to a square avatar before anything else: 360px keeps a phone upload
     at roughly 15 KB, which is what makes the local fallback affordable too */
  function shrink(file) {
    if (!file || !global.FileReader || !global.Image || !global.document) return Promise.resolve(null);
    if (TYPES.indexOf(file.type) === -1) return Promise.reject(new Error("use a JPG, PNG or WebP file"));
    if (file.size > MAX_BYTES) return Promise.reject(new Error("that file is over 8 MB"));
    return new Promise(function (resolve, reject) {
      var fr = new global.FileReader();
      fr.onerror = function () { reject(new Error("could not read the file")); };
      fr.onload = function () {
        var img = new global.Image();
        img.onerror = function () { reject(new Error("that is not a readable image")); };
        img.onload = function () {
          var S = 360, cv = global.document.createElement("canvas");
          cv.width = S; cv.height = S;
          var ctx = cv.getContext("2d");
          if (!ctx) return resolve(null);
          var side = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
          resolve({
            blob: cv.toDataURL("image/jpeg", 0.72),
            bytes: Math.round(cv.toDataURL("image/jpeg", 0.72).length * 0.75),
            canvasBlob: cv
          });
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function dataUrlOf(file) {
    return new Promise(function (resolve, reject) {
      var fr = new global.FileReader();
      fr.onerror = function () { reject(new Error("could not read the file")); };
      fr.onload = function () { resolve(fr.result); };
      fr.readAsDataURL(file);
    });
  }

  function uploadPhoto(file, name) {
    return shrink(file).then(function (small) {
      if (!small) throw new Error("canvas is not available in this browser");
      var base64 = small.blob.split(",")[1];
      if (state !== "ready") {
        return dataUrlOf(file).then(function (url) {
          return { url: small.blob, bytes: small.bytes, where: "device" };
        });
      }
      var path = PHOTO_DIR + String(name).replace(/[^a-z0-9_-]+/gi, "") + ".jpg";
      var ref = mods.storage.ref(store, path);
      return mods.storage.uploadBytes(ref, global.atob(base64), { contentType: "image/jpeg" })
        .then(function () { return mods.storage.getDownloadURL(ref); })
        .then(function (url) { return { url: url, path: path, bytes: small.bytes, where: "storage" }; });
    });
  }
  function removePhoto(path) {
    if (!path || state !== "ready") return Promise.resolve(false);
    return mods.storage.deleteObject(mods.storage.ref(store, path)).then(function () { return true; }, function () { return false; });
  }

  /* ---------------- roster ---------------- */
  function rowToUser(d) {
    var u = d.data();
    u.id = u.id || d.id;
    return u;
  }
  /* resolves null when the server could not be reached, [] when it is empty */
  function loadRoster() {
    if (state !== "ready") return Promise.resolve(null);
    var col = mods.firestore.collection(db, ROSTER);
    /* source:"server" on purpose: with the default behaviour an unreachable
       project answers from the empty local cache, and "nothing stored yet" would
       be indistinguishable from "cannot be read right now" */
    return mods.firestore.getDocs(mods.firestore.query(col, mods.firestore.limit(200)), { source: "server" }).then(function (snap) {
      /* a snapshot served from the offline cache is not an answer: "could not reach
         Firestore" must never be mistaken for "the collection has nobody in it" */
      if (snap.metadata && snap.metadata.fromCache) return null;
      return snap.docs.map(rowToUser).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    });
  }
  function watchRoster(cb) {
    if (state !== "ready") return function () {};
    var col = mods.firestore.collection(db, ROSTER);
    return mods.firestore.onSnapshot(col, function (snap) {
      cb(snap.docs.map(rowToUser).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); }), snap.metadata);
    }, function (e) { why = "roster read failed: " + e.message; fire(); });
  }
  function putUser(u) {
    if (state !== "ready") return Promise.resolve(false);
    var copy = {};
    for (var k in u) copy[k] = u[k];
    var id = copy.id; delete copy.id;
    return mods.firestore.setDoc(mods.firestore.doc(db, ROSTER, id), copy, { merge: true }).then(function () { return true; });
  }
  function dropUser(id) {
    if (state !== "ready") return Promise.resolve(false);
    return mods.firestore.deleteDoc(mods.firestore.doc(db, ROSTER, id)).then(function () { return true; });
  }

  global.FB = {
    VERSION: VERSION, ROSTER: ROSTER,
    config: config, setConfig: setConfig, clearConfig: clearConfig,
    parseSnippet: parseSnippet, configFile: configFile,
    state: function () { return state; }, reason: function () { return why; },
    connect: connect, on: on,
    signedIn: signedIn, signIn: signIn, signOut: signOut,
    uploadPhoto: uploadPhoto, removePhoto: removePhoto, shrink: shrink,
    loadRoster: loadRoster, watchRoster: watchRoster, putUser: putUser, dropUser: dropUser,
    live: function () { return state === "ready"; }
  };

  /* assets/firebase-config.js is committed with empty values, so filling it in is
     the only file edit needed; the panel can also store the config for this browser */
  (function boot() {
    if (!global.document) { connect(); return; }
    var me = global.document.querySelector("script[src*='firebase.js']");
    var base = me && me.getAttribute("src") ? me.getAttribute("src").replace(/firebase\.js$/, "") : "assets/";
    var s = global.document.createElement("script");
    s.src = base + "firebase-config.js";
    s.onload = function () { connect(); };
    s.onerror = function () { connect(); };
    global.document.head.appendChild(s);
  })();
})(window);
