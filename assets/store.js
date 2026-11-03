/* ==========================================================================
   store.js — data layer for Terox Chat (localStorage, no backend).
   Home, Chat and Profile all read/write through this so they stay in sync.
   ========================================================================== */
(function (global) {
  "use strict";

  var KEY = { chats: "terox.chats.v1", profile: "terox.profile.v1", prefs: "terox.prefs.v1" };

  /* every contact is online — product rule */
  var USERS = [
    { id: "meera", name: "Meera Iyer", role: "Frontend Lead", tint: "yes" },
    { id: "aarav", name: "Aarav Sharma", role: "Product Designer", tint: "accent" },
    { id: "kabir", name: "Kabir Nanda", role: "Backend", tint: "warn" },
    { id: "zoya", name: "Zoya Khan", role: "QA", tint: "no" },
    { id: "nafisa", name: "Nafisa Rahman", role: "Marketing", tint: "accent" },
    { id: "dev", name: "Dev Rajput", role: "Android", tint: "yes" },
    { id: "priya", name: "Priya Menon", role: "Data", tint: "warn" },
    { id: "harsh", name: "Harsh Vardhan", role: "Support", tint: "no" }
  ];

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
    return USERS.slice().sort(function (a, b) {
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
    USERS: USERS,
    chats: chats, thread: thread, order: order, last: last, lastAt: lastAt,
    unreadTotal: unreadTotal, markRead: markRead,
    append: append, receive: receive, edit: edit, remove: remove, restore: restore,
    find: function (id, msgId) { return find(chats(), id, msgId); },
    clearChat: clearChat, clearAll: clearAll,
    profile: profile, saveProfile: saveProfile,
    prefs: prefs, savePref: savePref,
    initials: initials, time: time, dateLong: dateLong, dayStamp: dayStamp, rowStamp: rowStamp,
    user: function (id) {
      for (var i = 0; i < USERS.length; i++) if (USERS[i].id === id) return USERS[i];
      return { id: id, name: "Chat", role: "", tint: "accent" };
    }
  };
})(window);
