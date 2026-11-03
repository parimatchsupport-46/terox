/* ==========================================================================
   ui.js — shared behaviour: theme, left drawer (button on the right),
   toasts, and navbar bits that read from the store.
   ========================================================================== */
(function (global) {
  "use strict";

  var root = document.documentElement;
  var lastFocus = null;

  /* ---------- theme ---------- */
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    paintThemeColor();
    syncSwitch();
    global.dispatchEvent(new CustomEvent("terox:theme", { detail: t }));
  }
  function toggleTheme() {
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }
  function paintThemeColor() {
    var meta = document.getElementById("themeColor");
    if (meta) meta.setAttribute("content", root.getAttribute("data-theme") === "dark" ? "#12141a" : "#f4f5f7");
  }
  function syncSwitch() {
    var sw = document.getElementById("darkSwitch");
    if (sw) sw.checked = root.getAttribute("data-theme") === "dark";
  }

  /* ---------- toast (with optional action, e.g. Undo) ---------- */
  var ICONS = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></svg>',
    bad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };

  function toast(text, kind, action) {
    var stack = document.querySelector(".toasts");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toasts";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    var el = document.createElement("div");
    el.className = "toast " + (kind === "ok" ? "ok" : kind === "bad" ? "bad" : "");
    el.innerHTML =
      '<span class="ti">' + (ICONS[kind] || ICONS.info) + "</span>" +
      '<span class="tb"></span>' +
      (action ? '<button class="taction" type="button"></button>' : "");
    el.querySelector(".tb").textContent = text;

    var timer;
    function close() {
      clearTimeout(timer);
      el.classList.add("leaving");
      setTimeout(function () { el.remove(); }, 200);
    }
    if (action) {
      var btn = el.querySelector(".taction");
      btn.textContent = action.label;
      btn.addEventListener("click", function () { action.onClick(); close(); });
    }
    timer = setTimeout(close, action ? 5000 : 2400);
    stack.appendChild(el);
    return close;
  }

  /* ---------- drawer: opens from the left ---------- */
  function drawerEl() { return document.getElementById("drawer"); }
  function openDrawer() {
    var d = drawerEl();
    if (!d) return;
    var scrim = document.getElementById("scrim");
    lastFocus = document.activeElement;
    d.classList.add("open");
    d.setAttribute("aria-hidden", "false");
    if (scrim) { scrim.hidden = false; requestAnimationFrame(function () { scrim.classList.add("show"); }); }
    document.body.classList.add("locked");
    var btn = document.getElementById("menuBtn");
    if (btn) btn.setAttribute("aria-expanded", "true");
    var first = d.querySelector("nav a");
    if (first) first.focus({ preventScroll: true });
  }
  function closeDrawer() {
    var d = drawerEl();
    if (!d || !d.classList.contains("open")) return;
    var scrim = document.getElementById("scrim");
    d.classList.remove("open");
    d.setAttribute("aria-hidden", "true");
    if (scrim) {
      scrim.classList.remove("show");
      setTimeout(function () { scrim.hidden = true; }, 220);
    }
    document.body.classList.remove("locked");
    var btn = document.getElementById("menuBtn");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ---------- chrome ---------- */
  function hydrate() {
    if (!global.Store) return;
    var p = Store.profile();
    var unread = Store.unreadTotal();

    document.querySelectorAll("[data-unread-pill]").forEach(function (n) {
      if (unread > 0) { n.textContent = unread > 99 ? "99+" : String(unread); n.hidden = false; }
      else n.hidden = true;
    });
    document.querySelectorAll("[data-davatar]").forEach(function (n) {
      n.className = "avatar s48 t-" + (p.tint || "accent");
      n.innerHTML = Store.initials(p.name) + '<span class="live"></span>';
    });
    var dn = document.querySelector("[data-dname]");
    if (dn) dn.textContent = p.name;
    var dh = document.querySelector("[data-dhandle]");
    if (dh) dh.textContent = "@" + p.username;

    var here = (location.pathname.split("/").pop() || "index.html").replace(".html", "");
    document.querySelectorAll(".drawer nav a").forEach(function (a) {
      var on = a.dataset.nav === (here === "chat" ? "chat" : here === "profile" ? "profile" : "home");
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* ---------- iOS Safari: block pinch zoom on the page ---------- */
  function blockZoom() {
    ["gesturestart", "gesturechange", "gestureend"].forEach(function (type) {
      document.addEventListener(type, function (e) { e.preventDefault(); }, { passive: false });
    });
    var startDist = 0;
    document.addEventListener("touchstart", function (e) {
      if (e.touches.length > 1) startDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
  }

  function init() {
    var t = document.getElementById("themeToggle");
    if (t) t.addEventListener("click", toggleTheme);
    var sw = document.getElementById("darkSwitch");
    if (sw) sw.addEventListener("change", function () { setTheme(sw.checked ? "dark" : "light"); });
    paintThemeColor();
    syncSwitch();

    var menu = document.getElementById("menuBtn");
    if (menu) menu.addEventListener("click", openDrawer);
    var close = document.getElementById("drawerClose");
    if (close) close.addEventListener("click", closeDrawer);
    var scrim = document.getElementById("scrim");
    if (scrim) scrim.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
    var d = drawerEl();
    if (d) d.querySelectorAll("nav a").forEach(function (a) {
      a.addEventListener("click", function () { setTimeout(closeDrawer, 120); });
    });

    blockZoom();
    hydrate();
    global.addEventListener("terox:change", hydrate);
  }

  global.UI = {
    setTheme: setTheme, toggleTheme: toggleTheme, toast: toast,
    openDrawer: openDrawer, closeDrawer: closeDrawer, hydrate: hydrate
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
