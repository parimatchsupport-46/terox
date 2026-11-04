/* ==========================================================================
   chat.js — thread view + composer + tap-to-open message action sheet.
   Sheet actions: Reply · Copy · Edit · Delete (plus message, date and time
   in its header). All state goes through Store so Home/Profile stay in sync.
   ========================================================================== */
(function () {
  "use strict";

  var EMOJI = ["👍", "🙏", "😄", "🔥", "🎉", "✅", "🚀", "❤️", "😅", "🤝"];
  var REPLIES = {
    meera: ["Done ✅", "Ek min, dekh raha hoon.", "Haan bilkul, mobile pe test ho gaya."],
    aarav: ["Radius 6px hi rakhna 👍", "Shadow same rakhunga.", "Bhej deta hoon design."],
    kabir: ["Sync ho gaya.", "API se bhej raha hoon, 2 min.", "Haan mil gaya issue."],
    zoya: ["Test pass ✅", "Ek edge case aur check kar leta hoon.", "Screenshot bhej diya."],
    nafisa: ["Copy bhej di hai, dekh lena.", "Thoda crisp kar dun?", "Approved 👍"],
    dev: ["Android pe clean chal raha hai.", "Build push kar diya.", "Haan dekh leta hoon."],
    priya: ["Numbers match kar rahe hain.", "Report bhej dunga kal.", "Haan calibrate ho gaya."],
    harsh: ["Ticket update kar diya.", "User ko reply bhej diya.", "Kal follow-up kar lunga."]
  };

  var el = {};
  var uid = null;
  var pendingReply = null;   /* message id being replied to */
  var editingId = null;      /* message id being edited   */
  var activeMsg = null;      /* message id in the sheet   */
  var replyTimer = null;

  function q(id) { return document.getElementById(id); }

  function cache() {
    el.thread = q("thread");
    el.peerName = q("peerName");
    el.peerStatus = q("peerStatus");
    el.peerAvatar = q("peerAvatar");
    el.peerProfile = q("peerProfile");
    el.typing = q("typingBar");
    el.typingWho = q("typingWho");
    el.input = q("input");
    el.send = q("sendBtn");
    el.form = q("composer");
    el.hint = q("hint");
    el.counter = q("counter");
    el.emoji = q("emojiRow");
    el.emojiBtn = q("emojiBtn");
    el.ctxReply = q("ctxReply");
    el.replyWho = q("replyWho");
    el.replyText = q("replyText");
    el.ctxEdit = q("ctxEdit");
    el.sheet = q("sheet");
    el.sheetScrim = q("sheetScrim");
    el.sheetText = q("sheetText");
    el.sheetDate = q("sheetDate");
    el.sheetTime = q("sheetTime");
    el.sheetFrom = q("sheetFrom");
    el.sheetEdited = q("sheetEdited");
  }

  /* ---------------- thread ---------------- */
  function openUser(id) {
    var user = Store.user(id);
    uid = user.id;
    var p = user;
    el.peerName.textContent = p.name;
    el.peerStatus.textContent = "Online";
    el.peerAvatar.innerHTML = UI.avatarHTML(p, 40, true);
    el.peerProfile.href = "user.html?u=" + encodeURIComponent(p.id);
    document.title = p.name + " · Terox Chat";
    Store.markRead(uid);
    render();
    scrollEnd(false);
  }

  function render() {
    var t = Store.thread(uid);
    var user = Store.user(uid);
    el.thread.innerHTML = "";

    if (!t.messages.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No messages yet — say hi ko " + user.name.split(" ")[0] + " 👋";
      el.thread.appendChild(empty);
      return;
    }

    var lastDay = null;
    t.messages.forEach(function (m) {
      var day = new Date(m.at).toDateString();
      if (day !== lastDay) {
        lastDay = day;
        var sep = document.createElement("span");
        sep.className = "badge badge-secondary day";
        sep.textContent = Store.dayStamp(m.at);
        el.thread.appendChild(sep);
      }
      el.thread.appendChild(row(m, user, t));
    });
  }

  function row(m, user, t) {
    var mine = m.from === "me";
    var wrap = document.createElement("div");
    wrap.className = "msg" + (mine ? " mine" : "");
    wrap.dataset.id = m.id;

    if (!mine) {
      var av = document.createElement("span");
      av.className = "av";
      av.setAttribute("aria-hidden", "true");
      av.innerHTML = UI.avatarHTML(user, 36, false);
      wrap.appendChild(av);
    }

    var b = document.createElement("div");
    b.className = "bubble";
    b.setAttribute("role", "button");
    b.setAttribute("tabindex", "0");
    b.setAttribute("aria-label", "Message options");

    if (m.replyTo) {
      var orig = Store.find(uid, m.replyTo);
      var quote = document.createElement("span");
      quote.className = "quote";
      if (orig) {
        quote.innerHTML = "<b></b><span class=\"txt\"></span>";
        quote.querySelector("b").textContent = orig.from === "me" ? "You" : user.name;
        quote.querySelector(".txt").textContent = snippet(orig.text);
        quote.addEventListener("click", function (e) {
          e.stopPropagation();
          jumpTo(m.replyTo);
        });
      } else {
        quote.classList.add("busted");
        quote.textContent = "Original message deleted";
      }
      b.appendChild(quote);
    }

    var body = document.createElement("span");
    body.textContent = m.text;
    b.appendChild(body);

    var tEl = document.createElement("span");
    tEl.className = "t";
    tEl.textContent = Store.time(m.at) + (m.editedAt ? " · edited" : "");
    if (m.editedAt) tEl.classList.add("edited");
    b.appendChild(tEl);

    b.addEventListener("click", function () { openSheet(m.id); });
    b.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(m.id); }
    });
    wrap.appendChild(b);
    return wrap;
  }

  function snippet(s) {
    var one = String(s).replace(/\s+/g, " ").trim();
    return one.length > 72 ? one.slice(0, 71) + "…" : one;
  }

  function scrollEnd(smooth) {
    el.thread.scrollTo
      ? el.thread.scrollTo({ top: el.thread.scrollHeight, behavior: smooth ? "smooth" : "auto" })
      : (el.thread.scrollTop = el.thread.scrollHeight);
  }

  function jumpTo(msgId) {
    var target = el.thread.querySelector('[data-id="' + msgId + '"]');
    if (!target) return;
    if (target.scrollIntoView) target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.classList.add("flash");
    setTimeout(function () { target.classList.remove("flash"); }, 1200);
  }

  /* ---------------- action sheet ---------------- */
  function openSheet(msgId) {
    var m = Store.find(uid, msgId);
    if (!m) return;
    activeMsg = msgId;
    var user = Store.user(uid);

    el.sheetText.textContent = m.text;
    el.sheetDate.textContent = Store.dateLong(m.at);
    el.sheetTime.textContent = Store.time(m.at);
    el.sheetFrom.textContent = m.from === "me" ? "You" : user.name;
    el.sheetEdited.hidden = !m.editedAt;

    var editBtn = el.sheet.querySelector('[data-act="edit"]');
    if (editBtn) editBtn.hidden = false;

    el.sheetScrim.hidden = false;
    requestAnimationFrame(function () { el.sheetScrim.classList.add("show"); });
    el.sheet.classList.add("open");
    el.sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");
    var first = el.sheet.querySelector(".sheet-actions button:not([hidden])");
    if (first) first.focus({ preventScroll: true });
  }

  function closeSheet() {
    if (!el.sheet) return;
    el.sheet.classList.remove("open");
    el.sheet.setAttribute("aria-hidden", "true");
    el.sheetScrim.classList.remove("show");
    setTimeout(function () { el.sheetScrim.hidden = true; }, 200);
    document.body.classList.remove("locked");
    activeMsg = null;
  }

  function act(kind) {
    var m = Store.find(uid, activeMsg);
    if (!m) return closeSheet();

    if (kind === "reply") {
      pendingReply = m.id;
      editingId = null;
      syncCtx();
      closeSheet();
      el.input.focus({ preventScroll: true });
      return;
    }

    if (kind === "copy") {
      copy(m.text);
      closeSheet();
      return;
    }

    if (kind === "edit") {
      editingId = m.id;
      pendingReply = null;
      el.input.value = m.text;
      autosize();
      syncCtx();
      closeSheet();
      el.input.focus({ preventScroll: true });
      if (el.input.setSelectionRange) { var n = el.input.value.length; el.input.setSelectionRange(n, n); }
      return;
    }

    if (kind === "delete") {
      var gone = Store.remove(uid, m.id);
      render();
      UI.hydrate();
      closeSheet();
      if (gone) {
        UI.toast("Message deleted", "bad", {
          label: "Undo",
          onClick: function () {
            Store.restore(uid, gone.index, gone.message);
            render();
            UI.hydrate();
            UI.toast("Message restored", "ok");
          }
        });
      }
    }
  }

  function copy(text) {
    var done = function () { UI.toast("Message copied", "ok"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
    } else {
      legacyCopy(text, done);
    }
  }
  function legacyCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { UI.toast("Copy failed — long press the text", "bad"); }
    document.body.removeChild(ta);
  }

  /* ---------------- composer ---------------- */
  function syncCtx() {
    el.ctxReply.hidden = !pendingReply;
    el.ctxEdit.hidden = !editingId;
    if (pendingReply) {
      var orig = Store.find(uid, pendingReply);
      var user = Store.user(uid);
      el.replyWho.textContent = orig ? (orig.from === "me" ? "yourself" : user.name) : "—";
      el.replyText.textContent = orig ? snippet(orig.text) : "message deleted";
    }
    el.send.disabled = !el.input.value.trim();
  }

  function autosize() {
    el.input.style.height = "auto";
    el.input.style.height = Math.min(120, Math.max(44, el.input.scrollHeight)) + "px";
    var len = el.input.value.length;
    el.counter.hidden = len < 3000;
    el.counter.textContent = len + "/4000";
    el.send.disabled = !el.input.value.trim() || (!!editingId && el.input.value.trim() === (Store.find(uid, editingId) || {}).text);
  }

  function submit() {
    var text = el.input.value.trim();
    if (!text) return;

    if (editingId) {
      Store.edit(uid, editingId, text);
      editingId = null;
      el.input.value = "";
      syncCtx();
      autosize();
      render();
      UI.hydrate();
      UI.toast("Message edited", "ok");
      return;
    }

    var sent = Store.append(uid, text, pendingReply ? { replyTo: pendingReply } : null);
    pendingReply = null;
    el.input.value = "";
    syncCtx();
    autosize();
    render();
    scrollEnd(true);
    UI.hydrate();
    simulateReply(sent);
  }

  /* the peer answers with loader dots first — no backend in this demo */
  function simulateReply(sent) {
    clearTimeout(replyTimer);
    var pool = REPLIES[uid] || ["👍"];
    el.typingWho.textContent = Store.user(uid).name.split(" ")[0] + " is typing…";
    el.typing.hidden = false;
    var row = document.createElement("div");
    row.className = "msg typing";
    row.innerHTML = '<span class="bubble"><span class="spinner-dots" role="status" aria-label="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></span>';
    row.id = "typingRow";
    el.thread.appendChild(row);
    scrollEnd(true);

    replyTimer = setTimeout(function () {
      el.typing.hidden = true;
      var r = document.getElementById("typingRow");
      if (r) r.remove();
      var text = pool[Math.floor(Math.random() * pool.length)];
      Store.receive(uid, text, sent && sent.id ? sent.id : null);
      render();
      scrollEnd(true);
      UI.hydrate();
    }, 900 + Math.random() * 800);
  }

  /* ---------------- wiring ---------------- */
  function init() {
    cache();

    var params = new URLSearchParams(location.search);
    var wanted = params.get("u");
    if (wanted && Store.user(wanted).id === wanted) openUser(wanted);
    else {
      var first = Store.order()[0];
      openUser(first ? first.id : Store.USERS[0].id);
    }

    el.form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
    el.input.addEventListener("input", function () { autosize(); syncCtx(); });
    el.input.addEventListener("keydown", function (e) {
      var enterSends = Store.prefs().enterToSend;
      if (e.key === "Enter" && !e.shiftKey && (enterSends || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit();
      }
    });

    q("replyCancel").addEventListener("click", function () { pendingReply = null; syncCtx(); });
    q("editCancel").addEventListener("click", function () {
      editingId = null;
      el.input.value = "";
      syncCtx();
      autosize();
    });

    EMOJI.forEach(function (e) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = e;
      b.setAttribute("aria-label", "Insert " + e);
      b.addEventListener("click", function () {
        el.input.value += e;
        autosize();
        el.input.focus({ preventScroll: true });
      });
      el.emoji.appendChild(b);
    });
    el.emojiBtn.addEventListener("click", function () {
      var on = el.emoji.classList.toggle("open");
      el.emojiBtn.setAttribute("aria-expanded", String(on));
    });

    el.sheet.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () { act(btn.dataset.act); });
    });
    el.sheetScrim.addEventListener("click", closeSheet);
    q("sheetClose").addEventListener("click", closeSheet);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
    el.thread.addEventListener("click", function (e) {
      if (e.target === el.thread) closeSheet();
    });

    var hint = Store.prefs().enterToSend
      ? "Tap a message to reply, copy, edit or delete"
      : "Send button bhejta hai · Enter = new line";
    el.hint.textContent = hint;

    window.addEventListener("terox:change", function () { render(); });
    window.addEventListener("terox:theme", function () { /* bubbles use tokens, nothing to do */ });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
