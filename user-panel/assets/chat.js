/* ==========================================================================
   chat.js — thread view + composer + tap-to-open message action sheet.
   Sheet actions: Reply · Copy · Edit · Delete (plus message, date and time
   in its header). All state goes through Store so Home/Profile stay in sync.

   The thread always starts empty. A taps "Start chat" to say hello, then the
   peer (B) answers on a scripted beat — 4s pause, 3s typing animation, then
   the rate card. Every option in B's bubble is a button: tapping it sends
   that choice as A's message, B types 3s and sends the next step, until the
   payment card, where "Pay now" opens the payment dialog. No backend: the
   whole exchange is driven from this file and stored in local storage.
   ========================================================================== */
(function () {
  "use strict";

  var EMOJI = ["👍", "🙏", "😄", "🔥", "🎉", "✅", "🚀", "❤️", "😅", "🤝"];

  /* ---- the rate card, exactly as agreed: duration + voice/video prices ---- */
  var RATE = [
    { d: "5 min", v: 200, x: 500 },
    { d: "10 min", v: 300, x: 1000 },
    { d: "20 min", v: 600, x: 1500 },
    { d: "30 min", v: 900, x: 2000 },
    { d: "40 min", v: 1200, x: 2500 },
    { d: "1 hour", v: 1800, x: 4000 }
  ];
  var SECTIONS = [
    { name: "Voice calling", key: "v" },
    { name: "Video calling", key: "x" }
  ];
  var NOTES = [
    "❌ Free proof available nahi hain.",
    "✅ QR code se payment — payment ke bina koi service provide nahi ki jayegi.",
    "❤️ Thank You!"
  ];

  /* ---- the beat: 4s before the first answer, 3s of typing, then the message ---- */
  var FIRST_WAIT = 4000;
  var NEXT_WAIT = 500;
  var TYPING = 3000;

  /* what B sends after each of A's choices */
  var NEXT = { start: "services", "pick-plan": "calls", "pick-type": "pay", paid: "ack" };
  /* what B repeats if A types instead of tapping an option */
  var PENDING = { services: "services", calls: "calls", pay: "pay" };

  var el = {};
  var uid = null;
  var pendingReply = null;   /* message id being replied to */
  var editingId = null;      /* message id being edited   */
  var activeMsg = null;      /* message id in the sheet   */
  var waitTimer = null;      /* the scripted flow's timer  */
  var payMsg = null;         /* the pay bubble that opened the dialog */
  var picks = blankPicks();

  function blankPicks() {
    return { d: null, svc: null, sec: null, mode: null, key: null, amount: null };
  }
  function q(id) { return document.getElementById(id); }
  function mk(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function first() { return Store.user(uid).name.split(" ")[0]; }
  function price(d, key) {
    var r = null;
    for (var i = 0; i < RATE.length; i++) if (RATE[i].d === d) r = RATE[i];
    return r ? "₹" + (key === "x" ? r.x : r.v) : "—";
  }
  function money(n) { return "₹" + n; }

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
    el.pay = q("payDlg");
    el.payScrim = q("payScrim");
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
    cancelReply();
    closePay();
    picks = blankPicks();
    render();
    scrollEnd(false);
    resume();
  }

  function render() {
    var t = Store.thread(uid);
    var user = Store.user(uid);
    el.thread.innerHTML = "";
    readPicks(t.messages);

    if (!t.messages.length) {
      el.thread.appendChild(startCard());
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

  /* an empty thread is a starting point, not a wall of old chat */
  function startCard() {
    var card = mk("div", "chat-start");
    var ttl = mk("b", null, "Say hello to " + first() + " 👋");
    var p = mk("p", null, "Abhi tak koi message nahi hai. Start dabaiye — " + first() + " rate card bhejenge, usme se apna plan chun lijiye.");
    var btn = mk("button", "btn block", "Start chat — say hello 👋");
    btn.type = "button";
    btn.id = "startChat";
    btn.addEventListener("click", startChat);
    card.appendChild(ttl);
    card.appendChild(p);
    card.appendChild(btn);
    return card;
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
    body.className = "mtext";
    body.textContent = m.text;
    b.appendChild(body);

    if (!mine && m.kind === "services") b.appendChild(rateCard());
    if (!mine && m.kind === "calls") b.appendChild(typePicker());
    if (!mine && m.kind === "pay") b.appendChild(payAsk(m));

    var tEl = document.createElement("span");
    tEl.className = "t";
    tEl.textContent = Store.time(m.at) + (m.editedAt ? " · edited" : "");
    if (m.editedAt) tEl.classList.add("edited");
    b.appendChild(tEl);

    b.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".opt, .pay-now")) return;
      openSheet(m.id);
    });
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
    var first2 = el.sheet.querySelector(".sheet-actions button:not([hidden])");
    if (first2) first2.focus({ preventScroll: true });
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

    Store.append(uid, text, pendingReply ? { replyTo: pendingReply } : null);
    pendingReply = null;
    el.input.value = "";
    syncCtx();
    autosize();
    render();
    scrollEnd(true);
    UI.hydrate();
    typedInstead();
  }

  /* ---------------- the scripted peer ---------------- */
  function lastPeer() {
    var list = Store.thread(uid).messages;
    for (var i = list.length - 1; i >= 0; i--) if (list[i].from === "them") return list[i];
    return null;
  }

  /* the choice A has already made, read back out of the stored thread */
  function readPicks(list) {
    picks = blankPicks();
    list.forEach(function (m) {
      if (m.from !== "me" || !m.pick) return;
      if (m.kind === "pick-plan") {
        picks.d = m.pick.d;
        picks.svc = m.pick.svc;
        picks.sec = m.pick.sec;
      }
      if (m.kind === "pick-type" || m.kind === "paid") {
        picks.mode = m.pick.mode;
        picks.key = m.pick.key;
      }
    });
    picks.amount = picks.d ? price(picks.d, picks.key || picks.sec) : null;
  }

  function showTyping(on) {
    var old = document.getElementById("typingRow");
    if (old) old.remove();
    if (!on) {
      if (el.typing) el.typing.hidden = true;
      return;
    }
    el.typingWho.textContent = first() + " is typing…";
    el.typing.hidden = false;
    var r = mk("div", "msg typing");
    r.id = "typingRow";
    var dots = mk("span", "spinner-dots");
    dots.setAttribute("role", "status");
    dots.setAttribute("aria-label", "typing");
    for (var i = 0; i < 3; i++) dots.appendChild(mk("span", "dot"));
    var b = mk("span", "bubble");
    b.appendChild(dots);
    r.appendChild(b);
    el.thread.appendChild(r);
    scrollEnd(true);
  }

  function cancelReply() {
    clearTimeout(waitTimer);
    waitTimer = null;
    if (el.typing) el.typing.hidden = true;
    var r = document.getElementById("typingRow");
    if (r) r.remove();
  }

  /* one beat of the flow: wait, type for 3s, then B's message lands */
  function queueReply(step) {
    if (!step || !STEPS[step]) return;
    clearTimeout(waitTimer);
    waitTimer = setTimeout(function () {
      showTyping(true);
      waitTimer = setTimeout(function () {
        showTyping(false);
        STEPS[step].send();
        render();
        scrollEnd(true);
        UI.hydrate();
      }, TYPING);
    }, STEPS[step].pre);
  }

  var STEPS = {
    services: {
      pre: FIRST_WAIT,
      send: function () {
        Store.receive(uid, "Rate card 👇 niche se apna plan tap kar dijiye.", { kind: "services" });
      }
    },
    calls: {
      pre: NEXT_WAIT,
      send: function () {
        Store.receive(uid, "Ab bataiye — call kis mode me karni hai?", { kind: "calls" });
      }
    },
    pay: {
      pre: NEXT_WAIT,
      send: function () {
        Store.receive(uid, "Payment kijiye — payment ke bina service start nahi hogi.", {
          kind: "pay",
          pick: { d: picks.d, svc: picks.svc, mode: picks.mode, key: picks.key, amount: picks.amount }
        });
      }
    },
    ack: {
      pre: NEXT_WAIT,
      send: function () {
        Store.receive(uid, "Payment mil gaya ✅ " + (picks.mode || "Call") + " · " + (picks.d || "") + " — ab connect kar raha hoon.", { kind: "ack" });
      }
    }
  };

  function startChat() {
    Store.append(uid, "Hello 👋", { kind: "start" });
    render();
    scrollEnd(true);
    UI.hydrate();
    queueReply("services");
  }

  /* a tap on one of B's options: the choice is sent as A's message */
  function sendPick(text, kind, pick, replyToPeer) {
    var opts = { kind: kind, pick: pick || null };
    if (replyToPeer !== false) {
      var peer = lastPeer();
      if (peer) opts.replyTo = peer.id;
    }
    Store.append(uid, text, opts);
    readPicks(Store.thread(uid).messages);
    render();
    scrollEnd(true);
    UI.hydrate();
    queueReply(NEXT[kind]);
  }

  /* if A types instead of tapping, B repeats the step it is waiting on */
  function typedInstead() {
    var last = Store.thread(uid).messages.slice(-1)[0];
    if (!last || last.from !== "me") return;
    if (NEXT[last.kind]) return;              /* the flow moved on by itself */
    var peer = lastPeer();
    if (peer && PENDING[peer.kind]) queueReply(PENDING[peer.kind]);
  }

  /* coming back to a half-finished thread picks up where it stopped */
  function resume() {
    var last = Store.thread(uid).messages.slice(-1)[0];
    if (last && last.from === "me" && NEXT[last.kind]) queueReply(NEXT[last.kind]);
  }

  /* ---------------- B's option blocks ---------------- */
  function rateCard() {
    var wrap = mk("div", "opts");
    SECTIONS.forEach(function (sec) {
      wrap.appendChild(mk("p", "opts-h", sec.name));
      RATE.forEach(function (r) {
        var amt = money(sec.key === "x" ? r.x : r.v);
        var b = mk("button", "opt");
        b.type = "button";
        b.appendChild(mk("span", "lbl", r.d));
        b.appendChild(mk("span", "price", amt));
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          sendPick(sec.name + " · " + r.d + " · " + amt, "pick-plan", { d: r.d, sec: sec.key, svc: sec.name });
        });
        wrap.appendChild(b);
      });
    });
    NOTES.forEach(function (n) { wrap.appendChild(mk("p", "opts-n", n)); });
    return wrap;
  }

  function typePicker() {
    var wrap = mk("div", "opts");
    [
      { ic: "📞", name: "Voice calling", key: "v" },
      { ic: "🎥", name: "Video calling", key: "x" }
    ].forEach(function (o) {
      var b = mk("button", "opt big");
      b.type = "button";
      b.appendChild(mk("span", "ic", o.ic));
      b.appendChild(mk("span", "lbl", o.name));
      b.appendChild(mk("span", "price", price(picks.d || "10 min", o.key)));
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        sendPick(o.name + " ✅", "pick-type", { mode: o.name, key: o.key });
      });
      wrap.appendChild(b);
    });
    wrap.appendChild(mk("p", "opts-n", "Rate aapke chune hue plan ke hisaab se lagega."));
    return wrap;
  }

  function payAsk(m) {
    var p = m.pick || {};
    var wrap = mk("div", "askpay");
    var sum = mk("div", "sum");
    [["Service", p.mode || p.svc || "—"], ["Duration", p.d || "—"], ["Amount", p.amount || "—"]].forEach(function (pair) {
      var r2 = mk("div");
      r2.appendChild(mk("span", null, pair[0]));
      r2.appendChild(mk("b", null, pair[1]));
      sum.appendChild(r2);
    });
    var btn = mk("button", "pay-now", "Pay now " + (p.amount || ""));
    btn.type = "button";
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      openPay(m);
    });
    wrap.appendChild(sum);
    wrap.appendChild(btn);
    wrap.appendChild(mk("p", "opts-n", "QR scan karke payment kijiye, phir “I’ve paid” dabaiye."));
    return wrap;
  }

  /* ---------------- payment dialog (frame: the contents come next) ---------------- */
  function openPay(m) {
    payMsg = m;
    var p = m.pick || {};
    q("paySub").textContent = "Pay " + (p.amount || "") + " to " + first();
    q("payService").textContent = p.mode || p.svc || "—";
    q("payPlan").textContent = p.d || "—";
    q("payAmount").textContent = p.amount || "—";
    el.pay.hidden = false;
    document.body.classList.add("locked");
    var done = q("payDone");
    if (done && done.focus) done.focus({ preventScroll: true });
  }

  function closePay() {
    if (!el.pay || el.pay.hidden) return;
    el.pay.hidden = true;
    payMsg = null;
    document.body.classList.remove("locked");
  }

  function paid() {
    var p = (payMsg && payMsg.pick) || {};
    closePay();
    sendPick("Payment kar diya ✅", "paid", { mode: p.mode, key: p.key, d: p.d, amount: p.amount });
    UI.toast("Bhej diya — " + first() + " confirm karenge", "ok");
  }

  /* ---------------- wiring ---------------- */
  function init() {
    cache();

    var params = new URLSearchParams(location.search);
    var wanted = params.get("u");
    if (wanted && Store.user(wanted).id === wanted) openUser(wanted);
    else {
      var firstU = Store.order()[0];
      openUser(firstU ? firstU.id : Store.USERS[0].id);
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
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (el.pay && !el.pay.hidden) closePay();
      else closeSheet();
    });
    el.thread.addEventListener("click", function (e) {
      if (e.target === el.thread) closeSheet();
    });

    q("payClose").addEventListener("click", closePay);
    q("payLater").addEventListener("click", function () {
      closePay();
      UI.toast("Payment ke bina service provide nahi ki jayegi", "bad");
    });
    q("payDone").addEventListener("click", paid);
    el.payScrim.addEventListener("click", closePay);

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
