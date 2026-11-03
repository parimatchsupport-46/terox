/* ==========================================================================
   store.js — tiny localStorage-backed data layer shared by all 3 pages.
   Keeps Home (recent chats), Chat (threads) and Profile (user card) in sync.
   ========================================================================== */
(function (global) {
  "use strict";

  var CHAT_KEY = "simpleui.chat.v1";
  var PROFILE_KEY = "simpleui.profile.v1";
  var PREFS_KEY = "simpleui.prefs.v1";

  var PEOPLE = {
    aarav: { id: "aarav", name: "Aarav Sharma", role: "Product Designer", tint: "accent", status: "online" },
    meera: { id: "meera", name: "Meera Iyer", role: "Frontend Lead", tint: "yes", status: "online" },
    kabir: { id: "kabir", name: "Kabir Nanda", role: "Backend", tint: "warn", status: "away" },
    zoya: { id: "zoya", name: "Zoya Khan", role: "QA", tint: "no", status: "offline" },
    team: { id: "team", name: "Design Guild", role: "6 members", tint: "accent", status: "online", group: true }
  };

  var DEFAULT_PROFILE = {
    name: "Rohan Verma",
    username: "rohanv",
    email: "rohan.verma@example.com",
    phone: "+91 98765 43210",
    location: "Jaipur, Rajasthan",
    role: "Product Engineer",
    bio: "I build small, fast interfaces. Currently keeping this UI in sync with the simple-ui design tokens.",
    joined: "2024-03-11",
    visibility: "Team only",
    avatarTint: "accent"
  };

  var DEFAULT_PREFS = {
    notifications: true,
    sounds: false,
    readReceipts: true,
    autoArchive: true,
    compact: false,
    enterToSend: true
  };

  var now = Date.now();
  var min = 60 * 1000;
  var hr = 60 * min;

  function seedThreads() {
    return {
      meera: {
        peer: "meera",
        pinned: true,
        unread: 2,
        messages: [
          { from: "them", text: "Tokens extract ho gaye — accent #4f6bed ke saath dark mode bhi set hai.", at: now - 5 * hr },
          { from: "me", text: "Nice. Radius 6px pe sab cards consistent dikh rahe hain.", at: now - 5 * hr + 4 * min },
          { from: "them", text: "Haan. Cards, buttons aur badges sab same layer se aate hain.", at: now - 22 * min },
          { from: "them", text: "Chat page ka composer ready hai, test kar lena?", at: now - 20 * min }
        ]
      },
      aarav: {
        peer: "aarav",
        unread: 0,
        messages: [
          { from: "them", text: "Hero card ka spacing 24px rakh rahe hain, library wale gap ke match.", at: now - 26 * hr },
          { from: "me", text: "Perfect. Shadow bhi same: 0 8px 30px rgba(0,0,0,.08).", at: now - 25 * hr }
        ]
      },
      team: {
        peer: "team",
        unread: 0,
        messages: [
          { from: "them", text: "Reminder: only import the components we actually need.", at: now - 2 * hr },
          { from: "them", name: "Kabir", text: "Tables aur modals skip kar rahe hain — zaroorat nahi.", at: now - 100 * min }
        ]
      },
      kabir: {
        peer: "kabir",
        unread: 0,
        messages: [
          { from: "me", text: "API mock ready hai? Chat list ko last message chahiye.", at: now - 30 * hr },
          { from: "them", text: "Haan, /threads endpoint pe mil jayega.", at: now - 29 * hr }
        ]
      },
      zoya: {
        peer: "zoya",
        unread: 0,
        messages: [
          { from: "them", text: "Mobile pe navbar 680px pe hamburger me convert ho raha hai ✅", at: now - 50 * hr }
        ]
      }
    };
  }

  function read(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable (private mode) — state stays in memory for this session */
    }
  }

  /* ---------- profile ---------- */
  function getProfile() {
    var stored = read(PROFILE_KEY, null);
    var merged = {};
    for (var k in DEFAULT_PROFILE) merged[k] = DEFAULT_PROFILE[k];
    if (stored) for (var p in stored) merged[p] = stored[p];
    return merged;
  }
  function saveProfile(patch) {
    var next = getProfile();
    for (var k in patch) next[k] = patch[k];
    write(PROFILE_KEY, next);
    return next;
  }

  /* ---------- preferences ---------- */
  function getPrefs() {
    var stored = read(PREFS_KEY, null) || {};
    var merged = {};
    for (var k in DEFAULT_PREFS) merged[k] = DEFAULT_PREFS[k];
    for (var p in stored) merged[p] = stored[p];
    return merged;
  }
  function savePref(key, value) {
    var next = getPrefs();
    next[key] = value;
    write(PREFS_KEY, next);
    return next;
  }

  /* ---------- threads ---------- */
  function getThreads() {
    var stored = read(CHAT_KEY, null);
    return stored && stored.threads ? stored.threads : seedThreads();
  }
  function saveThreads(threads) {
    write(CHAT_KEY, { threads: threads, savedAt: Date.now() });
  }
  function resetThreads() {
    saveThreads(seedThreads());
    return getThreads();
  }

  function orderedIds(threads) {
    return Object.keys(threads).sort(function (a, b) {
      var A = threads[a], B = threads[b];
      if (!!A.pinned !== !!B.pinned) return A.pinned ? -1 : 1;
      return lastAt(threads, b) - lastAt(threads, a);
    });
  }

  function last(threads, id) {
    var list = threads[id].messages;
    return list[list.length - 1] || null;
  }
  function lastAt(threads, id) {
    var m = last(threads, id);
    return m ? m.at : 0;
  }
  function totalUnread(threads) {
    return Object.keys(threads).reduce(function (sum, id) {
      return sum + (threads[id].unread || 0);
    }, 0);
  }

  function appendMessage(id, text, from) {
    var threads = getThreads();
    if (!threads[id]) return null;
    threads[id].messages.push({ from: from || "me", text: text, at: Date.now() });
    if (from === "them") threads[id].unread = (threads[id].unread || 0) + 1;
    saveThreads(threads);
    return threads;
  }

  function markRead(id) {
    var threads = getThreads();
    if (!threads[id] || !threads[id].unread) return threads;
    threads[id].unread = 0;
    saveThreads(threads);
    return threads;
  }

  function preview(threads, id) {
    var m = last(threads, id);
    if (!m) return "";
    var prefix = m.from === "me" ? "You: " : (threads[id].peer !== "team" ? "" : (m.name ? m.name + ": " : ""));
    return prefix + m.text;
  }

  /* ---------- helpers ---------- */
  function initials(name) {
    var parts = String(name).trim().split(/\s+/);
    if (!parts[0]) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }

  function timeOf(at) {
    return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function whenLabel(at) {
    var d = new Date(at);
    var today = new Date();
    var diffDays = Math.floor((startOfDay(today) - startOfDay(d)) / (24 * hr));
    if (diffDays === 0) return timeOf(at);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  }

  function dayLabel(at) {
    var d = new Date(at);
    var today = new Date();
    var diff = Math.floor((startOfDay(today) - startOfDay(d)) / (24 * hr));
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  global.Store = {
    PEOPLE: PEOPLE,
    getProfile: getProfile,
    saveProfile: saveProfile,
    getPrefs: getPrefs,
    savePref: savePref,
    getThreads: getThreads,
    saveThreads: saveThreads,
    resetThreads: resetThreads,
    orderedIds: orderedIds,
    appendMessage: appendMessage,
    markRead: markRead,
    preview: preview,
    lastAt: lastAt,
    totalUnread: totalUnread,
    initials: initials,
    timeOf: timeOf,
    whenLabel: whenLabel,
    dayLabel: dayLabel
  };
})(window);
