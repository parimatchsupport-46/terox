/* ==========================================================================
   store.js — data layer for Terox Chat (localStorage, no backend).
   Home, Chat and Profile all read/write through this so they stay in sync.
   ========================================================================== */
const Store = (function () {
  "use strict";

  var KEY = {
    chats: "terox.chats.v1", profile: "terox.profile.v1", prefs: "terox.prefs.v1",
    users: "terox.users.v1"
  };

  /* avatar pool: the images in assets/avatars, one per user, never reused */
  var AVATARS = ["a01.jpg", "a02.jpg", "a03.jpg", "a04.jpg", "a05.jpg", "a06.jpg", "a07.jpg", "a08.jpg", "a09.jpg", "a10.jpg", "a11.jpg", "a12.jpg", "a13.jpg", "a14.jpg", "a15.jpg", "a16.jpg", "a17.jpg", "a18.jpg", "a19.jpg", "a20.jpg", "a21.jpg", "a22.jpg", "a23.jpg", "a24.jpg", "a25.jpg", "a26.jpg", "a27.jpg", "a28.jpg", "a29.jpg", "a30.jpg", "a31.jpg", "a32.jpg", "a33.jpg", "a34.jpg", "a35.jpg"];
  var AVATAR_DIR = "assets/avatars/";

  /* the roster. Seeded from data/users.json, then owned by the admin panel
     (localStorage terox.users.v1). Every contact is online — product rule. */
  var SEED_USERS =     [
      {
        "id": "meera",
        "name": "Priya",
        "username": "meeraiyer",
        "bio": "Frontend Lead. Ships the CSS, breaks the build, fixes the build.",
        "photo": "a01.jpg",
        "tint": "yes",
        "role": "Frontend Lead"
      },
      {
        "id": "aarav",
        "name": "Anjali",
        "username": "aarav",
        "bio": "Product Designer. Radius 6px or nothing.",
        "photo": "a05.jpg",
        "tint": "accent",
        "role": "Product Designer"
      },
      {
        "id": "kabir",
        "name": "Pooja",
        "username": "kabirn",
        "bio": "Backend. Patch bhej raha hoon, review kar lena.",
        "photo": "a06.jpg",
        "tint": "warn",
        "role": "Backend"
      },
      {
        "id": "zoya",
        "name": "Neha",
        "username": "zoyak",
        "bio": "QA. Zoom lock, tap targets, dark mode \u2014 sab test kiya.",
        "photo": "a02.jpg",
        "tint": "no",
        "role": "QA"
      },
      {
        "id": "nafisa",
        "name": "Sneha",
        "username": "nafisa",
        "bio": "Marketing. Launch copy ready hai.",
        "photo": "a03.jpg",
        "tint": "accent",
        "role": "Marketing"
      },
      {
        "id": "dev",
        "name": "Simran",
        "username": "devr",
        "bio": "Android. Side se koi issue nahi aaya.",
        "photo": "a07.jpg",
        "tint": "yes",
        "role": "Android"
      },
      {
        "id": "priya",
        "name": "Riya",
        "username": "priyam",
        "bio": "Data. Dashboard numbers calibrate ho gaye.",
        "photo": "a04.jpg",
        "tint": "warn",
        "role": "Data"
      },
      {
        "id": "harsh",
        "name": "Shivani",
        "username": "harshv",
        "bio": "Support. 2 tickets pending hain, kal dekh lena.",
        "photo": "a08.jpg",
        "tint": "no",
        "role": "Support"
      },
      {
        "id": "tanvid",
        "name": "Divya",
        "username": "tanvid",
        "bio": "QA. Report bhej diya, triage kar lena.",
        "photo": "a09.jpg",
        "tint": "accent",
        "role": "QA"
      },
      {
        "id": "rohitn",
        "name": "Khushi",
        "username": "rohitn",
        "bio": "Mobile. Android side se build green hai.",
        "photo": "a10.jpg",
        "tint": "yes",
        "role": "Mobile"
      },
      {
        "id": "snehap",
        "name": "Nisha",
        "username": "snehap",
        "bio": "Content. Copy ready, tone soft kiya thoda.",
        "photo": "a11.jpg",
        "tint": "warn",
        "role": "Content"
      },
      {
        "id": "adityar",
        "name": "Komal",
        "username": "adityar",
        "bio": "Data. Dashboard numbers recalibrate ho gaye.",
        "photo": "a12.jpg",
        "tint": "accent",
        "role": "Data"
      },
      {
        "id": "ishitab",
        "name": "Payal",
        "username": "ishitab",
        "bio": "Design. Figma me spacing fix hai, dekh lena.",
        "photo": "a13.jpg",
        "tint": "yes",
        "role": "Design"
      },
      {
        "id": "farhanq",
        "name": "Sakshi",
        "username": "farhanq",
        "bio": "DevOps. Rollback nahi karna pada, sab thik.",
        "photo": "a14.jpg",
        "tint": "warn",
        "role": "DevOps"
      },
      {
        "id": "ritikas",
        "name": "Aarti",
        "username": "ritikas",
        "bio": "Product. Scope tight rakha hai, good.",
        "photo": "a15.jpg",
        "tint": "accent",
        "role": "Product"
      },
      {
        "id": "manavg",
        "name": "Kajal",
        "username": "manavg",
        "bio": "Security. Dependabot alerts 4 -> 0.",
        "photo": "a16.jpg",
        "tint": "yes",
        "role": "Security"
      },
      {
        "id": "poojah",
        "name": "Swati",
        "username": "poojah",
        "bio": "Support. Escalation 2, dono resolved.",
        "photo": "a17.jpg",
        "tint": "warn",
        "role": "Support"
      },
      {
        "id": "kunalm",
        "name": "Monika",
        "username": "kunalm",
        "bio": "Frontend. Shadow bhi same: 0 8px 30px.",
        "photo": "a18.jpg",
        "tint": "accent",
        "role": "Frontend"
      },
      {
        "id": "ayeshas",
        "name": "Sonali",
        "username": "ayeshas",
        "bio": "Localization. Hindi strings pass ho gayi.",
        "photo": "a19.jpg",
        "tint": "yes",
        "role": "Localization"
      },
      {
        "id": "vikrams",
        "name": "Priti",
        "username": "vikrams",
        "bio": "Payments. Gateway timeout replay nahi hoga.",
        "photo": "a20.jpg",
        "tint": "warn",
        "role": "Payments"
      },
      {
        "id": "nehac",
        "name": "Shreya",
        "username": "nehac",
        "bio": "Research. Notes doc me daal diye.",
        "photo": "a21.jpg",
        "tint": "accent",
        "role": "Research"
      },
      {
        "id": "sidj",
        "name": "Tanvi",
        "username": "sidj",
        "bio": "Platform. Rate limit 200/min pe set.",
        "photo": "a22.jpg",
        "tint": "yes",
        "role": "Platform"
      },
      {
        "id": "tarab",
        "name": "Kriti",
        "username": "tarab",
        "bio": "Brand. Logo padding 2px zyada theek lag rahi.",
        "photo": "a23.jpg",
        "tint": "warn",
        "role": "Brand"
      },
      {
        "id": "harshitaj",
        "name": "Muskan",
        "username": "harshitaj",
        "bio": "Marketing. Launch copy bhej diya hai.",
        "photo": "a24.jpg",
        "tint": "accent",
        "role": "Marketing"
      },
      {
        "id": "arjunr",
        "name": "Jyoti",
        "username": "arjunr",
        "bio": "iOS. TestFlight build 214 live.",
        "photo": "a25.jpg",
        "tint": "yes",
        "role": "iOS"
      },
      {
        "id": "meherk",
        "name": "Deepika",
        "username": "meherk",
        "bio": "Ops. Roster audit done, 2 duplicates removed.",
        "photo": "a26.jpg",
        "tint": "warn",
        "role": "Ops"
      },
      {
        "id": "yashp",
        "name": "Radhika",
        "username": "yashp",
        "bio": "Growth. Retention 1.8pt up this week.",
        "photo": "a27.jpg",
        "tint": "accent",
        "role": "Growth"
      },
      {
        "id": "diyam",
        "name": "Megha",
        "username": "diyam",
        "bio": "Design. Empty states ban gaye.",
        "photo": "a28.jpg",
        "tint": "yes",
        "role": "Design"
      },
      {
        "id": "kabirs",
        "name": "Pallavi",
        "username": "kabirs",
        "bio": "Backend. Patch bhej raha hoon, ek din me.",
        "photo": "a29.jpg",
        "tint": "warn",
        "role": "Backend"
      },
      {
        "id": "ananyab",
        "name": "Ananya",
        "username": "ananyab",
        "bio": "Accessibility. Contrast AA pass, ab focus bhi.",
        "photo": "a30.jpg",
        "tint": "accent",
        "role": "Accessibility"
      },
      {
        "id": "rehanm",
        "name": "Isha",
        "username": "rehanm",
        "bio": "Infra. Node 20 upgrade smooth tha.",
        "photo": "a31.jpg",
        "tint": "yes",
        "role": "Infra"
      },
      {
        "id": "sanyak",
        "name": "Snehal",
        "username": "sanyak",
        "bio": "Product. Roadmap Q1 me shift kiya.",
        "photo": "a32.jpg",
        "tint": "warn",
        "role": "Product"
      },
      {
        "id": "devansh",
        "name": "Garima",
        "username": "devansh",
        "bio": "Frontend. Zoom lock test ho gaya.",
        "photo": "a33.jpg",
        "tint": "accent",
        "role": "Frontend"
      },
      {
        "id": "prishan",
        "name": "Bhavna",
        "username": "prishan",
        "bio": "Content. Glossary update kar diya.",
        "photo": "a34.jpg",
        "tint": "yes",
        "role": "Content"
      },
      {
        "id": "omprakash",
        "name": "Nikita",
        "username": "omprakash",
        "bio": "QA. Regression suite 46 min me pass.",
        "photo": "a35.jpg",
        "tint": "warn",
        "role": "QA"
      }
    ];

  // One-time migration renames the original roster while preserving IDs and other fields.
  var NAME_MIGRATION = {
    "meera": "Priya", "aarav": "Anjali", "kabir": "Pooja", "zoya": "Neha",
    "nafisa": "Sneha", "dev": "Simran", "priya": "Riya", "harsh": "Shivani",
    "tanvid": "Divya", "rohitn": "Khushi", "snehap": "Nisha", "adityar": "Komal",
    "ishitab": "Payal", "farhanq": "Sakshi", "ritikas": "Aarti", "manavg": "Kajal",
    "poojah": "Swati", "kunalm": "Monika", "ayeshas": "Sonali", "vikrams": "Priti",
    "nehac": "Shreya", "sidj": "Tanvi", "tarab": "Kriti", "harshitaj": "Muskan",
    "arjunr": "Jyoti", "meherk": "Deepika", "yashp": "Radhika", "diyam": "Megha",
    "kabirs": "Pallavi", "ananyab": "Ananya", "rehanm": "Isha", "sanyak": "Snehal",
    "devansh": "Garima", "prishan": "Bhavna", "omprakash": "Nikita"
  };
  var USERS_RAW = null;
  var USERS = null;

  var PROFILE = {
    name: "Rohan Verma",
    username: "rohanv",
    phone: "+91 98765 43210",
    bio: "Available",
    tint: "accent"
  };

  var PREFS = { notifications: true, sounds: false, enterToSend: true };

  var now = Date.now();
  var MIN = 60000;
  var HR = 60 * MIN;
  var DAY = 24 * HR;
  var seq = 0;

  function mid() {
    seq += 1;
    return "m" + now.toString(36) + seq.toString(36);
  }
  function msg(from, text, at, extra) {
    var m = { id: mid(), from: from, text: text, at: at };
    if (extra) for (var k in extra) m[k] = extra[k];
    return m;
  }

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  /* ---------------- the roster (admin panel owns this) ---------------- */
  function users() {
    var raw = null;
    try { raw = localStorage.getItem(KEY.users); } catch (e) {}
    // Firestore can update localStorage from another panel; don't keep a stale roster.
    if (!USERS || raw !== USERS_RAW) {
      var stored = read(KEY.users, null);
      if (Array.isArray(stored)) {
        try {
          if (!localStorage.getItem("terox.names.202611.v1")) {
            stored = stored.map(function (u) {
              var change = NAME_MIGRATION[u.id];
              return change ? Object.assign({}, u, { name: change }) : u;
            });
            write(KEY.users, stored);
            localStorage.setItem("terox.names.202611.v1", "1");
            raw = localStorage.getItem(KEY.users);
          }
        } catch (e) {}
      }
      USERS = Array.isArray(stored) ? stored : SEED_USERS.map(function (u) { return u; });
      USERS_RAW = raw;
    }
    return USERS;
  }
  function saveUsers(next) {
    USERS = next;
    write(KEY.users, next);
    emit();
    return next;
  }
  function usedPhotos(list) {
    var seen = {};
    (list || users()).forEach(function (u) { if (u.photo) seen[u.photo] = 1; });
    return seen;
  }
  /* first image in the pool that no user has yet — "one image, one user" */
  function freePhoto(list) {
    var taken = usedPhotos(list);
    for (var i = 0; i < AVATARS.length; i++) if (!taken[AVATARS[i]]) return AVATARS[i];
    return null;
  }
  function freeCount() {
    return AVATARS.length - Object.keys(usedPhotos()).length;
  }
  function resetUsers() {
    USERS = SEED_USERS.map(function (u) { return u; });
    write(KEY.users, USERS);
    emit();
    return USERS;
  }

  function photoSrc(u) {
    return u && u.photo ? AVATAR_DIR + u.photo : null;
  }
  function slug(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "user";
  }
  function uidFrom(name, list) {
    var base = slug(name), id = base, n = 2;
    var taken = {};
    (list || users()).forEach(function (u) { taken[u.id] = 1; taken[u.username] = 1; });
    while (taken[id]) { id = base + n; n += 1; }
    return id;
  }
  function addUser(data) {
    var list = users().slice();
    var id = uidFrom(data.name, list);
    var u = {
      id: id,
      name: String(data.name).trim(),
      username: (data.username ? String(data.username).trim() : "@" + id).replace(/^@/, ""),
      bio: String(data.bio || "").trim(),
      photo: data.photo === undefined ? freePhoto(list) : data.photo,
      /* an image the admin uploaded lives here, not in the pool */
      /* an image the admin uploaded travels as this data URL - there is no
         file store to point at, and none is wanted */
      photoURL: data.photoURL || null,
      tint: "accent",
      role: String(data.role || "").trim()
    };
    list.push(u);
    saveUsers(list);
    return u;
  }
  function updateUser(id, patch) {
    var list = users().map(function (u) {
      if (u.id !== id) return u;
      var next = {};
      for (var k in u) next[k] = u[k];
      for (var p in patch) next[p] = patch[p];
      return next;
    });
    saveUsers(list);
    return list.filter(function (u) { return u.id === id; })[0] || null;
  }
  function removeUser(id) {
    var gone = null;
    var list = users().filter(function (u) {
      if (u.id !== id) return true;
      gone = u;
      return false;
    });
    saveUsers(list);
    return gone;
  }

  /* ---------------- threads ---------------- */
  /* nothing ships with the app: every thread starts empty on a fresh device */
  function chats() {
    var stored = read(KEY.chats, null);
    if (stored && typeof stored === "object") return stored;
    write(KEY.chats, {});
    return {};
  }
  function saveChats(next) {
    write(KEY.chats, next);
    emit();
    return next;
  }
  function thread(id) {
    var all = chats();
    return all[id] || { messages: [], unread: 0 };
  }

  function order() {
    var all = chats();
    return users().slice().sort(function (a, b) {
      return lastAt(all, b.id) - lastAt(all, a.id);
    });
  }
  function lastAt(all, id) {
    var t = all[id];
    if (!t || !t.messages.length) return 0;
    return t.messages[t.messages.length - 1].at;
  }
  function last(all, id) {
    var t = all[id];
    if (!t || !t.messages.length) return null;
    return t.messages[t.messages.length - 1];
  }
  function unreadTotal() {
    var all = chats();
    return Object.keys(all).reduce(function (n, id) { return n + (all[id].unread || 0); }, 0);
  }

  function append(id, text, opts) {
    var all = chats();
    var t = all[id] || { messages: [], unread: 0 };
    var m = msg("me", text, Date.now(), opts || null);
    t.messages.push(m);
    all[id] = t;
    saveChats(all);
    return m;
  }
  function receive(id, text, extra) {
    var all = chats();
    var t = all[id] || { messages: [], unread: 0 };
    var opts = typeof extra === "string" ? { replyTo: extra } : (extra || null);
    var m = msg("them", text, Date.now(), opts);
    t.messages.push(m);
    all[id] = t;
    saveChats(all);
    return m;
  }
  function edit(id, msgId, text) {
    var all = chats();
    var m = find(all, id, msgId);
    if (!m) return null;
    m.text = text;
    m.editedAt = Date.now();
    saveChats(all);
    return m;
  }
  function remove(id, msgId) {
    var all = chats();
    var t = all[id];
    if (!t) return null;
    var idx = -1;
    t.messages.forEach(function (m, i) { if (m.id === msgId) idx = i; });
    if (idx < 0) return null;
    var gone = t.messages.splice(idx, 1)[0];
    saveChats(all);
    return { index: idx, message: gone };
  }
  function restore(id, index, message) {
    var all = chats();
    var t = all[id] || { messages: [], unread: 0 };
    t.messages.splice(index, 0, message);
    saveChats(all);
  }
  function find(all, id, msgId) {
    var t = all[id];
    if (!t) return null;
    for (var i = 0; i < t.messages.length; i++) if (t.messages[i].id === msgId) return t.messages[i];
    return null;
  }
  function markRead(id) {
    var all = chats();
    if (!all[id] || !all[id].unread) return;
    all[id].unread = 0;
    saveChats(all);
  }
  function clearChat(id) {
    var all = chats();
    if (!all[id]) return;
    all[id] = { messages: [], unread: 0 };
    saveChats(all);
  }
  function clearAll() {
    var all = chats();
    Object.keys(all).forEach(function (id) { all[id] = { messages: [], unread: 0 }; });
    saveChats(all);
  }

  /* ---------------- profile & prefs ---------------- */
  function profile() {
    var stored = read(KEY.profile, null) || {};
    var out = {};
    for (var k in PROFILE) out[k] = stored[k] === undefined ? PROFILE[k] : stored[k];
    return out;
  }
  function saveProfile(patch) {
    var next = profile();
    for (var k in patch) next[k] = patch[k];
    write(KEY.profile, next);
    emit();
    return next;
  }
  function prefs() {
    var stored = read(KEY.prefs, null) || {};
    var out = {};
    for (var k in PREFS) out[k] = stored[k] === undefined ? PREFS[k] : stored[k];
    return out;
  }
  function savePref(k, v) {
    var next = prefs();
    next[k] = v;
    write(KEY.prefs, next);
    return next;
  }

  /* ---------------- formatting ---------------- */
  function initials(name) {
    var p = String(name).trim().split(/\s+/);
    if (!p[0]) return "?";
    return (p[0].charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase();
  }
  function time(at) {
    return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  function dateLong(at) {
    return new Date(at).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function dayStamp(at) {
    var d = new Date(at), t = new Date();
    var days = Math.floor((startOfDay(t) - startOfDay(d)) / DAY);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return d.toLocaleDateString([], { weekday: "long" });
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  }
  function rowStamp(at) {
    var d = new Date(at), t = new Date();
    var days = Math.floor((startOfDay(t) - startOfDay(d)) / DAY);
    if (days === 0) return time(at);
    if (days === 1) return "Yesterday";
    if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { day: "2-digit", month: "short" });
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

  function emit() {
    window.dispatchEvent(new Event("terox:change"));
  }

  /* ---------------- payment requests (admin panel verifies) ----------------
     A user fills the UTR number and uploads a payment proof image, then taps
     "Payment Complete". That creates a pending request here. The admin panel
     reads these from its Payment Manager page and accepts or rejects each one.
     The user's verification popup stays open until the request is resolved. */
  var PAY_KEY = "terox.payreq.v1";
  function payReqs() {
    var stored = read(PAY_KEY, null);
    return Array.isArray(stored) ? stored : [];
  }
  function savePayReqs(next) {
    write(PAY_KEY, next);
    emit();
    return next;
  }
  function addPayReq(req) {
    var next = payReqs().concat([req]);
    savePayReqs(next);
    return req;
  }
  function updatePayReq(id, status) {
    var next = payReqs().map(function (r) {
      if (r.id !== id) return r;
      var r2 = {};
      for (var k in r) r2[k] = r[k];
      r2.status = status;
      r2.resolvedAt = Date.now();
      return r2;
    });
    savePayReqs(next);
    return next.filter(function (r) { return r.id === id; })[0] || null;
  }
  function removePayReq(id) {
    var next = payReqs().filter(function (r) { return r.id !== id; });
    savePayReqs(next);
    return next;
  }
  function pendingPayReqs() {
    return payReqs().filter(function (r) { return r.status === "pending"; });
  }
  function payReqForUser(uid) {
    var all = payReqs();
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].uid === uid) return all[i];
    }
    return null;
  }
  function userStats(uid) {
    var t = thread(uid);
    var msgs = t.messages || [];
    var chatted = msgs.length > 0;
    var paid = false;
    var pending = false;
    var reqs = payReqs().filter(function (r) { return r.uid === uid; });
    reqs.forEach(function (r) {
      if (r.status === "accepted") paid = true;
      if (r.status === "pending") pending = true;
    });
    var utr = reqs.some(function (r) { return r.status === "pending" || r.status === "accepted"; });
    return { chatted: chatted, messages: msgs.length, paid: paid, pending: pending, utr: utr, lastAt: lastAt(chats(), uid) };
  }

  /* ---------- global reply scheduling + typing (survives navigation) ---------- */
  var NEXT = { start: "services", "pick-service": "rates", "pick-plan": "pay", "pick-type": "pay", paid: "ack" };
  var PENDING = { services: "services", rates: "rates", pay: "pay" };
  var FIRST_WAIT = 4000, NEXT_WAIT = 500, TYPING = 3000;
  var RATE = [
    { d: "5 min", v: 200, x: 500 },
    { d: "10 min", v: 300, x: 1000 },
    { d: "20 min", v: 600, x: 1500 },
    { d: "30 min", v: 900, x: 2000 },
    { d: "40 min", v: 1200, x: 2500 },
    { d: "1 hour", v: 1800, x: 4000 }
  ];
  var SECTIONS = [
    { key: "v", name: "Voice calling" },
    { key: "x", name: "Video calling" }
  ];
  function money(n) { return "₹" + n; }
  function price(d, key) {
    var r = RATE.filter(function (x) { return x.d === d; })[0];
    return r ? money(key === "x" ? r.x : r.v) : "—";
  }
  function picksOf(list) {
    var p = { d: null, svc: null, sec: null, mode: null, key: null, amount: null };
    list.forEach(function (m) {
      if (m.from !== "me" || !m.pick) return;
      if (m.kind === "pick-service") { p.svc = m.pick.svc; p.sec = m.pick.sec; p.mode = m.pick.mode; p.key = m.pick.key; }
      if (m.kind === "pick-plan") { p.d = m.pick.d; p.svc = m.pick.svc; p.sec = m.pick.sec; }
      if (m.kind === "pick-type" || m.kind === "paid") { p.mode = m.pick.mode; p.key = m.pick.key; }
    });
    p.amount = p.d ? price(p.d, p.key || p.sec) : null;
    return p;
  }
  var _replies = {};
  var _typing = { on: false, name: "" };
  function queueReply(uid, step) {
    if (!step) { cancelReply(uid); return; }
    cancelReply(uid);
    var rec = { step: step, t1: null, t2: null };
    _replies[uid] = rec;
    var pre = step === "services" ? FIRST_WAIT : NEXT_WAIT;
    var nm = "";
    var u = users().filter(function (x) { return x.id === uid; })[0];
    if (u) nm = u.name;
    rec.t1 = setTimeout(function () {
      setTyping(true, nm);
      rec.t2 = setTimeout(function () {
        setTyping(false, "");
        sendReply(uid, step);
        cancelReply(uid);
      }, TYPING);
    }, pre);
  }
  function cancelReply(uid) {
    var rec = _replies[uid];
    if (!rec) return;
    if (rec.t1) clearTimeout(rec.t1);
    if (rec.t2) clearTimeout(rec.t2);
    delete _replies[uid];
  }
  function sendReply(uid, step) {
    var p = picksOf(thread(uid).messages);
    if (step === "services") receive(uid, "Select your type options", { kind: "services" });
    if (step === "rates") receive(uid, "Select your plan below", { kind: "rates", pick: { key: p.key, svc: p.svc, sec: p.sec } });
    if (step === "pay") receive(uid, "Please complete the payment to start the service.", { kind: "pay", pick: { d: p.d, svc: p.svc, mode: p.mode, key: p.key, amount: p.amount } });
    if (step === "ack") receive(uid, "Payment mil gaya ✅ " + (p.mode || "Call") + " · " + (p.d || "") + " — ab connect kar raha hoon.", { kind: "ack" });
  }
  function setTyping(on, name) {
    _typing.on = !!on;
    _typing.name = name || "";
    window.dispatchEvent(new Event("terox:change"));
  }
  function typingOn() { return _typing.on; }
  function typingName() { return _typing.name; }
  function cancelAllReplies() { Object.keys(_replies).forEach(cancelReply); }

  return {
    get USERS() { return users(); },
    chats: chats, thread: thread, order: order, last: last, lastAt: lastAt,
    unreadTotal: unreadTotal, markRead: markRead,
    append: append, receive: receive, edit: edit, remove: remove, restore: restore,
    find: function (id, msgId) { return find(chats(), id, msgId); },
    clearChat: clearChat, clearAll: clearAll,
    profile: profile, saveProfile: saveProfile,
    prefs: prefs, savePref: savePref,
    initials: initials, time: time, dateLong: dateLong, dayStamp: dayStamp, rowStamp: rowStamp,
    AVATARS: AVATARS,
    users: users, saveUsers: saveUsers, addUser: addUser, updateUser: updateUser,
    removeUser: removeUser, resetUsers: resetUsers, freePhoto: freePhoto, freeCount: freeCount,
    usedPhotos: usedPhotos, photoSrc: photoSrc, slug: slug,
    user: function (id) {
      var list = users();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return { id: id, name: "Chat", username: "", bio: "", photo: null, role: "", tint: "accent" };
    },
    queueReply: queueReply, cancelReply: cancelReply, cancelAllReplies: cancelAllReplies,
    setTyping: setTyping, typingOn: typingOn, typingName: typingName,
    RATE: RATE, SECTIONS: SECTIONS, price: price, picksOf: picksOf, money: money,
    NEXT: NEXT, PENDING: PENDING,
    payReqs: payReqs, addPayReq: addPayReq, updatePayReq: updatePayReq, removePayReq: removePayReq,
    pendingPayReqs: pendingPayReqs, payReqForUser: payReqForUser, userStats: userStats
  };
})();

export default Store;
