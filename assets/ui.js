/* ==========================================================================
   ui.js — shared behaviour: theme (library pattern), mobile nav, toast,
   and hydration of the navbar bits that depend on stored data.
   ========================================================================== */
(function (global) {
  "use strict";

  var root = document.documentElement;

  /* ---------- theme (same contract as the library) ---------- */
  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
    global.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  }

  function toggleTheme() {
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }

  function setSystemTheme() {
    try { localStorage.setItem("theme", ""); } catch (e) {}
    setTheme(global.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  /* ---------- toast (from Toast notifications) ---------- */
  var ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };

  function toast(title, message, kind) {
    var type = kind || "success";
    var stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }

    var el = document.createElement("div");
    el.className = "alert alert-" + type;
    el.innerHTML =
      '<div class="alert-icon">' + (ICONS[type] || ICONS.info) + "</div>" +
      '<div class="alert-body"><div class="alert-title"></div>' +
      (message ? '<div class="alert-msg"></div>' : "") +
      "</div>" +
      '<button class="alert-close" aria-label="Dismiss"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';

    el.querySelector(".alert-title").textContent = title;
    if (message) el.querySelector(".alert-msg").textContent = message;

    var timer = setTimeout(close, 3200);
    function close() {
      clearTimeout(timer);
      el.classList.add("leaving");
      setTimeout(function () { el.remove(); }, 220);
    }
    el.querySelector(".alert-close").addEventListener("click", close);
    stack.appendChild(el);
  }

  /* ---------- chrome: navbar bits that read from the store ---------- */
  function hydrateChrome() {
    if (!global.Store) return;
    var profile = Store.getProfile();
    var threads = Store.getThreads();
    var unread = Store.totalUnread(threads);

    document.querySelectorAll("[data-nav-count]").forEach(function (node) {
      if (unread > 0) {
        node.textContent = unread > 9 ? "9+" : String(unread);
        node.hidden = false;
      } else {
        node.hidden = true;
      }
    });

    document.querySelectorAll("[data-nav-avatar]").forEach(function (node) {
      node.textContent = Store.initials(profile.name);
      node.title = profile.name;
      node.className = "nav-avatar avatar t-" + (profile.avatarTint || "accent");
      node.style.borderRadius = "999px";
    });
  }

  /* ---------- init ---------- */
  function init() {
    var themeBtn = document.getElementById("themeToggle");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    var menuBtn = document.getElementById("menuBtn");
    var navLinks = document.getElementById("navLinks");
    if (menuBtn && navLinks) {
      menuBtn.addEventListener("click", function () {
        var open = navLinks.classList.toggle("open");
        menuBtn.classList.toggle("open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
      });
      navLinks.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          navLinks.classList.remove("open");
          menuBtn.classList.remove("open");
        }
      });
    }

    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    hydrateChrome();
    global.addEventListener("storechange", hydrateChrome);
  }

  global.UI = {
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    setSystemTheme: setSystemTheme,
    toast: toast,
    hydrateChrome: hydrateChrome
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
