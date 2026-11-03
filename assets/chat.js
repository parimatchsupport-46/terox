/* ==========================================================================
   chat.js — conversation list + thread + composer.
   Library pieces in play: Search bar, Badges, Loader dots (typing),
   Tooltips (composer actions), Cards & buttons (frame + send).
   ========================================================================== */
(function () {
  "use strict";

  var EMOJI = ["👍", "🙏", "🎉", "🔥", "😄", "✅", "🚀", "❤️"];

  var REPLIES = {
    meera: [
      "Check kar liya, bubbles ka shadow bhi same hai.",
      "Send kar deta hoon review comment, 5 min do.",
      "Haan — search bar filter bhi kaam kar raha hai."
    ],
    aarav: [
      "Spacing 24px hi rakhni hai, library wale gap ke match.",
      "Card ka radius 6px — subtle hi acha lagta hai.",
      "Dark mode me accent #7b92ff, contrast theek hai."
    ],
    kabir: [
      "Mock API ready hai, /threads pe data aa jayega.",
      "Latency ~200ms, typing indicator ke liye kaafi.",
      "Main side se pagination dekh raha hoon."
    ],
    zoya: [
      "Mobile 680px breakpoint pe hamburger test ho gaya ✅",
      "Ek edge case: empty thread ka state dekh lo.",
      "Regression pass clean hai."
    ],
    team: [
      "Noted. Sirf zaroori components import karne hain.",
      "Design guild me ye pattern discuss hua tha 👍",
      "Minutes me add kar dunga."
    ]
  };

  var el = {};
  var currentId = null;
  var filter = "";
  var replyTimer = null;

  function q(sel) { return document.querySelector(sel); }

  function cache() {
    el.frame = q("#chatFrame");
    el.list = q("#convList");
    el.search = q("#convSearch");
    el.count = q("#threadCount");
    el.messages = q("#messages");
    el.peerAvatar = q("#peerAvatar");
    el.peerName = q("#peerName");
    el.peerDot = q("#peerDot");
    el.peerMeta = q("#peerMeta");
    el.input = q("#composerInput");
    el.send = q("#sendBtn");
    el.emojiRow = q("#emojiRow");
    el.emojiBtn = q("#emojiBtn");
    el.typingBadge = q("#typingBadge");
    el.hint = q("#composerHint");
    el.back = q("#backBtn");
  }

  /* ---------------- sidebar ---------------- */
  function renderList() {
    var threads = Store.getThreads();
    var ids = Store.orderedIds(threads).filter(function (id) {
      if (!filter) return true;
      var person = Store.PEOPLE[threads[id].peer];
      var hay = (person.name + " " + person.role + " " + Store.preview(threads, id)).toLowerCase();
      return hay.indexOf(filter.toLowerCase()) !== -1;
    });

    el.count.textContent = ids.length + (ids.length === 1 ? " chat" : " chats");
    el.list.innerHTML = "";

    if (!ids.length) {
      var empty = document.createElement("p");
      empty.className = "side-empty";
      empty.textContent = 'Koi conversation nahi mili — "' + filter + '"';
      el.list.appendChild(empty);
      return;
    }

    ids.forEach(function (id) {
      var thread = threads[id];
      var person = Store.PEOPLE[thread.peer];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "conv" + (id === currentId ? " active" : "") + (thread.unread ? " unread" : "");
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", String(id === currentId));
      btn.dataset.id = id;
      btn.innerHTML =
        '<span class="avatar size-40 t-' + person.tint + '">' + Store.initials(person.name) + "</span>" +
        "<span style=\"min-width:0\">" +
          '<span class="c-top"><span class="c-name"></span><span class="c-time"></span></span>' +
          '<span class="c-bot"><span class="c-msg"></span>' +
          (thread.pinned ? '<span class="badge badge-outline" style="padding:2px 7px;font-size:.68rem">pin</span>' : "") +
          (thread.unread ? '<span class="badge badge-primary" style="padding:2px 8px">' + thread.unread + "</span>" : "") +
          "</span>" +
        "</span>";
      btn.querySelector(".c-name").textContent = person.name;
      btn.querySelector(".c-time").textContent = Store.whenLabel(Store.lastAt(threads, id));
      btn.querySelector(".c-msg").textContent = Store.preview(threads, id) || "No messages yet";
      btn.addEventListener("click", function () { open(id); });
      el.list.appendChild(btn);
    });
  }

  /* ---------------- thread ---------------- */
  function renderThread() {
    var threads = Store.getThreads();
    var thread = threads[currentId];
    if (!thread) {
      el.messages.innerHTML = '<p class="muted" style="margin:auto;text-align:center;padding:40px">Select a conversation to start.</p>';
      el.peerName.textContent = "Chatter";
      el.peerMeta.textContent = "no thread selected";
      return;
    }

    var person = Store.PEOPLE[thread.peer];
    el.peerName.textContent = person.name;
    el.peerMeta.textContent = person.group
      ? person.role
      : (person.status === "online" ? "online" : person.status === "away" ? "away" : person.role + " · offline");
    el.peerDot.className = "dot-status" + (person.status !== "offline" ? " " + person.status : "");
    el.peerAvatar.className = "avatar size-40 t-" + person.tint;
    el.peerAvatar.textContent = person.group ? "◆" : Store.initials(person.name);
    el.messages.classList.toggle("compact", !!Store.getPrefs().compact);

    var nearBottom = el.messages.scrollHeight - el.messages.scrollTop - el.messages.clientHeight < 140;
    el.messages.innerHTML = "";

    var lastDay = null;
    thread.messages.forEach(function (m) {
      var day = new Date(m.at).toDateString();
      if (day !== lastDay) {
        lastDay = day;
        var sep = document.createElement("span");
        sep.className = "badge badge-secondary day-sep";
        sep.textContent = Store.dayLabel(m.at);
        el.messages.appendChild(sep);
      }

      var row = document.createElement("div");
      row.className = "msg " + (m.from === "me" ? "out" : "in");

      var bubble = document.createElement("div");
      bubble.className = "bubble " + (m.from === "me" ? "out" : "in");
      bubble.textContent = m.text;
      var meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = (m.from === "me" ? "You · " : (m.name ? m.name + " · " : "")) + Store.timeOf(m.at);
      bubble.appendChild(meta);
      row.appendChild(bubble);

      if (m.from !== "me") {
        var who = document.createElement("span");
        who.className = "avatar size-32 t-" + person.tint;
        who.textContent = m.name ? Store.initials(m.name) : Store.initials(person.name);
        who.setAttribute("aria-hidden", "true");
        row.insertBefore(who, row.firstChild);
      }
      el.messages.appendChild(row);
    });

    if (nearBottom || thread.justSent) scrollToBottom();
  }

  function scrollToBottom() {
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  function open(id, forceThread) {
    currentId = id;
    clearTimeout(replyTimer);
    el.typingBadge.hidden = true;
    Store.markRead(id);
    if (forceThread !== false) el.frame.setAttribute("data-view", "thread");
    renderList();
    renderThread();
    UI.hydrateChrome();
    if (window.innerWidth > 760) el.input.focus();
  }

  /* ---------------- typing indicator (Loaders ▸ dots) ---------------- */
  function showTyping(on) {
    var existing = q("#typingRow");
    if (!on) {
      if (existing) existing.remove();
      el.typingBadge.hidden = true;
      return;
    }
    el.typingBadge.hidden = false;
    if (existing) return;
    var row = document.createElement("div");
    row.className = "msg in";
    row.id = "typingRow";
    row.innerHTML =
      '<div class="bubble in"><span class="spinner-dots" role="status" aria-label="typing">' +
      '<span class="dot"></span><span class="dot"></span><span class="dot"></span></span></div>';
    el.messages.appendChild(row);
    scrollToBottom();
  }

  /* ---------------- sending ---------------- */
  function send() {
    var text = el.input.value.trim();
    if (!text || !currentId) return;

    Store.appendMessage(currentId, text, "me");
    el.input.value = "";
    autosize();
    el.send.disabled = true;
    renderList();
    renderThread();
    scrollToBottom();
    UI.hydrateChrome();

    var thread = Store.getThreads()[currentId];
    var peerId = thread.peer;
    var target = currentId;
    var pool = REPLIES[peerId] || ["👍"];
    var delay = 900 + Math.random() * 900;

    showTyping(true);
    replyTimer = setTimeout(function () {
      showTyping(false);
      var reply = pool[Math.floor(Math.random() * pool.length)];
      Store.appendMessage(target, reply, "them");
      /* a reply landing in the thread you are already reading is not "unread" */
      if (currentId === target) Store.markRead(target);
      renderList();
      renderThread();
      UI.hydrateChrome();
    }, delay);
  }

  function autosize() {
    el.input.style.height = "auto";
    el.input.style.height = Math.min(150, Math.max(46, el.input.scrollHeight)) + "px";
    el.send.disabled = !el.input.value.trim();
  }

  /* ---------------- wiring ---------------- */
  function init() {
    cache();

    var params = new URLSearchParams(location.search);
    var wanted = params.get("c");
    var threads = Store.getThreads();
    if (wanted && threads[wanted]) currentId = wanted;
    else {
      var ids = Store.orderedIds(threads);
      currentId = window.innerWidth > 760 ? ids[0] : null;
    }
    if (currentId) Store.markRead(currentId);

    if (currentId) el.frame.setAttribute("data-view", "thread");
    renderList();
    renderThread();
    UI.hydrateChrome();

    el.search.addEventListener("input", function () {
      filter = el.search.value;
      renderList();
    });

    el.input.addEventListener("input", autosize);
    el.input.addEventListener("keydown", function (e) {
      var enterSends = Store.getPrefs().enterToSend;
      if (e.key === "Enter" && !e.shiftKey && enterSends) {
        e.preventDefault();
        send();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        send();
      }
    });
    el.send.addEventListener("click", send);

    EMOJI.forEach(function (emoji) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = emoji;
      b.setAttribute("aria-label", "Insert " + emoji);
      b.addEventListener("click", function () {
        el.input.value += (el.input.value && !/\s$/.test(el.input.value) ? " " : "") + emoji;
        autosize();
        el.input.focus();
      });
      el.emojiRow.appendChild(b);
    });
    el.emojiBtn.addEventListener("click", function () {
      var open = el.emojiRow.classList.toggle("open");
      el.emojiBtn.setAttribute("aria-expanded", String(open));
    });

    el.back.addEventListener("click", function () {
      el.frame.setAttribute("data-view", "list");
      el.search.focus();
    });

    q("#muteBtn").addEventListener("click", function () {
      if (!currentId) return;
      var threads2 = Store.getThreads();
      threads2[currentId].muted = !threads2[currentId].muted;
      Store.saveThreads(threads2);
      UI.toast(
        threads2[currentId].muted ? "Muted" : "Unmuted",
        Store.PEOPLE[threads2[currentId].peer].name + " — notifications " + (threads2[currentId].muted ? "paused" : "back on"),
        threads2[currentId].muted ? "info" : "success"
      );
    });

    q("#clearBtn").addEventListener("click", function () {
      if (!currentId) return;
      var threads3 = Store.getThreads();
      threads3[currentId].messages = [];
      threads3[currentId].unread = 0;
      Store.saveThreads(threads3);
      renderList();
      renderThread();
      UI.hydrateChrome();
      UI.toast("Thread cleared", "Messages removed from this local session.", "danger");
    });

    var prefs = Store.getPrefs();
    el.hint.textContent = prefs.enterToSend
      ? "Enter bhejta hai · Shift + Enter new line"
      : "Send button se bhejo · Enter = new line";

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) el.frame.removeAttribute("data-view");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
