/* ==========================================================================
   store.js — data layer for Terox Chat (localStorage, no backend).
   Home, Chat and Profile all read/write through this so they stay in sync.
   ========================================================================== */
(function (global) {
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
  var SEED_USERS = [
      {
          "id": "meera",
          "name": "Meera Iyer",
          "username": "meeraiyer",
          "bio": "Frontend Lead. Ships the CSS, breaks the build, fixes the build.",
          "photo": "a01.jpg",
          "tint": "yes",
          "role": "Frontend Lead"
      },
      {
          "id": "aarav",
          "name": "Aarav Sharma",
          "username": "aarav",
          "bio": "Product Designer. Radius 6px or nothing.",
          "photo": null,
          "tint": "accent",
          "role": "Product Designer"
      },
      {
          "id": "kabir",
          "name": "Kabir Nanda",
          "username": "kabirn",
          "bio": "Backend. Patch bhej raha hoon, review kar lena.",
          "photo": null,
          "tint": "warn",
          "role": "Backend"
      },
      {
          "id": "zoya",
          "name": "Zoya Khan",
          "username": "zoyak",
          "bio": "QA. Zoom lock, tap targets, dark mode — sab test kiya.",
          "photo": "a02.jpg",
          "tint": "no",
          "role": "QA"
      },
      {
          "id": "nafisa",
          "name": "Nafisa Rahman",
          "username": "nafisa",
          "bio": "Marketing. Launch copy ready hai.",
          "photo": "a03.jpg",
          "tint": "accent",
          "role": "Marketing"
      },
      {
          "id": "dev",
          "name": "Dev Rajput",
          "username": "devr",
          "bio": "Android. Side se koi issue nahi aaya.",
          "photo": null,
          "tint": "yes",
          "role": "Android"
      },
      {
          "id": "priya",
          "name": "Priya Menon",
          "username": "priyam",
          "bio": "Data. Dashboard numbers calibrate ho gaye.",
          "photo": "a04.jpg",
          "tint": "warn",
          "role": "Data"
      },
      {
          "id": "harsh",
          "name": "Harsh Vardhan",
          "username": "harshv",
          "bio": "Support. 2 tickets pending hain, kal dekh lena.",
          "photo": null,
          "tint": "no",
          "role": "Support"
      }
  ];

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

  function seed() {
    return {
      meera: [
        msg("them", "Bhai mobile layout pe kaam shuru karun?", now - 2 * DAY),
        msg("me", "Haan, pehle list screen clean karo.", now - 2 * DAY + 3 * MIN),
        msg("them", "Done. Ab sirf users ki list hai, sab online.", now - 26 * HR),
        msg("me", "Perfect, composer bhi wahi pattern follow karo.", now - 25 * HR),
        msg("them", "Kar diya. Reply + edit + delete sab tap pe aata hai.", now - 18 * MIN)
      ],
      aarav: [
        msg("them", "Radius 6px rakha hai, library ke match.", now - 30 * HR),
        msg("me", "6px hi sahi hai, subtle lagta hai.", now - 29 * HR),
        msg("them", "Shadow bhi same: 0 8px 30px rgba(0,0,0,.08)", now - 5 * HR)
      ],
      kabir: [
        msg("them", "Sync ho gaya, ab unread count bhi aa raha hai", now - 3 * HR),
        msg("them", "Ek aur patch bhej raha hoon", now - 40 * MIN, { unread: true })
      ],
      zoya: [msg("me", "Zoom lock test ho gaya? ✅", now - 20 * HR)],
      nafisa: [msg("them", "Launch copy bhej diya hai, ek look de dena", now - 2 * DAY - 2 * HR)],
      dev: [msg("them", "Android side se koi issue nahi aaya", now - 4 * DAY)],
      priya: [msg("me", "Dashboard numbers calibrate ho gaye?", now - 6 * DAY)],
      harsh: [msg("them", "2 tickets pending hain, kal dekh lena", now - 8 * DAY)]
    };
  }

  /* the one unread seed lives inside a message flag — fold it onto the thread */
  function normalise(raw) {
    var out = {};
    Object.keys(raw).forEach(function (id) {
      var list = raw[id].map(function (m) {
        var copy = { id: m.id || mid(), from: m.from, text: m.text, at: m.at };
        if (m.replyTo) copy.replyTo = m.replyTo;
        if (m.editedAt) copy.editedAt = m.editedAt;
        return copy;
      });
      var unread = raw[id].reduce(function (n, m) { return n + (m.unread ? 1 : 0); }, 0);
      out[id] = { messages: list, unread: unread };
    });
    return out;
  }

  function read(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  /* ---------------- the roster (admin panel owns this) ---------------- */
  function users() {
    if (!USERS) {
      var stored = read(KEY.users, null);
      USERS = Array.isArray(stored) ? stored : SEED_USERS.map(function (u) { return u; });
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
  function chats() {
    var stored = read(KEY.chats, null);
    if (stored && stored.meera) return stored;
    var seeded = normalise(seed());
    write(KEY.chats, seeded);
    return seeded;
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
    var m = msg("me", text, Date.now());
    if (opts && opts.replyTo) m.replyTo = opts.replyTo;
    t.messages.push(m);
    all[id] = t;
    saveChats(all);
    return m;
  }
  function receive(id, text, replyTo) {
    var all = chats();
    var t = all[id] || { messages: [], unread: 0 };
    var m = msg("them", text, Date.now(), replyTo ? { replyTo: replyTo } : null);
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
    global.dispatchEvent(new Event("terox:change"));
  }


  global.Store = {
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
    }
  };
})(window);
