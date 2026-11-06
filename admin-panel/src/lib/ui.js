/* ==========================================================================
   ui.js — the shared behaviour that is not markup: theme paint, toasts and the
   one avatar builder every surface uses. The drawer and the navbar chrome are
   React components now, but everything that reaches the screen still writes
   exactly the classes the stylesheet already knows, so the look is unchanged.
   ========================================================================== */
import Store from "./store.js";

var root = document.documentElement;

/* ---------- theme ---------- */
function setTheme(t) {
  root.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch (e) {}
  paintThemeColor();
  window.dispatchEvent(new CustomEvent("terox:theme", { detail: t }));
}
function toggleTheme() {
  setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
}
function paintThemeColor() {
  var meta = document.getElementById("themeColor");
  if (meta) meta.setAttribute("content", root.getAttribute("data-theme") === "dark" ? "#12141a" : "#f4f5f7");
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

/* Vite fingerprints the avatar pool, so the bundle hands the real urls over */
var AVATARS = {};
function setAvatarMap(map) { AVATARS = map || {}; }

/* ---------------- avatars ----------------
   One markup builder for every surface: a photo sits on top of the initials,
   and if the image file is missing the <img> removes itself so the initials
   (and the tint) stay visible. */
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function avatarHTML(u, size, withLive) {
  u = u || {};
  var src = u.photoURL ? u.photoURL : (u.photo ? AVATARS[u.photo] || "assets/avatars/" + u.photo : null);
  var img = src
    ? '<img class="av-img" src="' + esc(src) + '" alt="" loading="lazy" onerror="this.parentNode.classList.add(\'no-photo\');this.remove()">'
    : "";
  return '<span class="avatar s' + size + " t-" + esc(u.tint || "accent") + '">' +
    img + esc(Store ? Store.initials(u.name || "?") : "?") +
    (withLive ? '<span class="live"></span>' : "") +
    "</span>";
}

/* ---------------- iOS Safari: block pinch zoom on the page ---------------- */
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

paintThemeColor();

const UI = {
  setTheme: setTheme, toggleTheme: toggleTheme, toast: toast,
  avatarHTML: avatarHTML, escapeHtml: esc, setAvatarMap: setAvatarMap,
  blockZoom: blockZoom
};

export default UI;
