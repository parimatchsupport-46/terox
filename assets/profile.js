/* ==========================================================================
   profile.js — inline editing of the account card, preference toggles,
   theme segmented control. Components reused: card, button, badge,
   toggle switch, toast. No modal component (editing happens in place).
   ========================================================================== */
(function () {
  "use strict";

  var FIELD_NAMES = ["name", "username", "email", "phone", "location", "visibility", "bio"];
  var COMPLETE_ON = ["name", "username", "email", "phone", "location", "bio"];
  var TINTS = ["accent", "yes", "no", "warn"];

  var profile = {};
  var draft = {};
  var editing = false;

  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function inputs() {
    var map = {};
    FIELD_NAMES.forEach(function (name) {
      map[name] = document.getElementById("f" + name.charAt(0).toUpperCase() + name.slice(1));
    });
    return map;
  }

  /* ---------------- header ---------------- */
  function renderHeader(p) {
    var tint = TINTS.indexOf(p.avatarTint) > -1 ? p.avatarTint : "accent";
    qa("#avatarBig").forEach(function (node) {
      node.className = "avatar size-88 t-" + tint;
      node.textContent = Store.initials(p.name || "?");
    });
    q("#pName").textContent = p.name || "Unnamed";
    q("#pHandle").textContent = p.username || "user";
    q("#pRole").textContent = p.role || "—";
    q("#pVis").textContent = p.visibility || "Public";
    q("#pLoc").textContent = p.location || "No location";
    q("#pJoined").textContent = "Joined " + new Date(p.joined).toLocaleDateString([], { month: "short", year: "numeric" });

    var filled = COMPLETE_ON.filter(function (k) { return String(p[k] || "").trim().length; }).length;
    var pct = Math.round((filled / COMPLETE_ON.length) * 100);
    q("#progFill").style.width = pct + "%";
    q("#progLabel").textContent = filled + " of " + COMPLETE_ON.length + " fields complete";

    qa("#tintRow [data-tint]").forEach(function (btn) {
      var on = btn.dataset.tint === tint;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", String(on));
    });

    var threads = Store.getThreads();
    var mine = Object.keys(threads).reduce(function (n, id) {
      return n + threads[id].messages.filter(function (m) { return m.from === "me"; }).length;
    }, 0);
    q("#modeBadge").textContent = editing ? "Editing" : "Read only";
    q("#modeBadge").className = "badge " + (editing ? "badge-primary" : "badge-secondary");

    /* activity rows reuse the .row pattern from the home page */
    var list = q("#activityList");
    list.innerHTML = "";
    Store.orderedIds(threads).slice(0, 3).forEach(function (id) {
      var thread = threads[id];
      var person = Store.PEOPLE[thread.peer];
      var last = thread.messages[thread.messages.length - 1];
      var row = document.createElement("a");
      row.className = "row";
      row.href = "chat.html?c=" + id;
      row.innerHTML =
        '<span class="avatar size-32 t-' + person.tint + '">' + Store.initials(person.name) + "</span>" +
        "<span style=\"min-width:0\"><span class=\"r-top\"><span class=\"r-name\"></span><span class=\"r-time\"></span></span>" +
        "<span class=\"r-msg\" style=\"display:block\"></span></span>" +
        '<span class="badge badge-secondary">' + thread.messages.length + (thread.messages.length === 1 ? " message" : " messages") + "</span>";
      row.querySelector(".r-name").textContent = "You messaged " + person.name;
      row.querySelector(".r-time").textContent = last ? Store.whenLabel(last.at) : "no messages";
      row.querySelector(".r-msg").textContent = last ? last.text : "This thread is empty.";
      list.appendChild(row);
    });

    q("#composerStat").textContent = mine + " messages sent";
  }

  /* ---------------- form ---------------- */
  function fillForm(values) {
    var map = inputs();
    FIELD_NAMES.forEach(function (name) {
      if (map[name]) map[name].value = values[name] == null ? "" : values[name];
    });
  }

  function setEditing(on) {
    editing = on;
    var map = inputs();
    FIELD_NAMES.forEach(function (name) {
      var input = map[name];
      if (!input) return;
      input.disabled = !on;
      input.parentElement.setAttribute("aria-readonly", String(!on));
    });
    q("#formActions").hidden = !on;
    q("#editBtn").innerHTML = on
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg> Stop editing'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Edit details';
    q("#modeBadge").textContent = on ? "Editing" : "Read only";
    q("#modeBadge").className = "badge " + (on ? "badge-primary" : "badge-secondary");
    if (on) { document.getElementById("fName").focus(); }
  }

  function save(e) {
    e.preventDefault();
    if (!editing) return;

    var map = inputs();
    var patch = {};
    FIELD_NAMES.forEach(function (name) { patch[name] = String(map[name].value).trim(); });

    if (!patch.name) {
      UI.toast("Name is required", "Add a display name before saving.", "danger");
      map.name.focus();
      return;
    }
    if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(patch.email)) {
      UI.toast("Email looks off", "Use a full address, e.g. you@example.com", "danger");
      map.email.focus();
      return;
    }
    if (patch.username) patch.username = patch.username.replace(/[^a-z0-9_.-]/gi, "").toLowerCase();

    profile = Store.saveProfile(patch);
    draft = Object.assign({}, profile);
    fillForm(profile);
    setEditing(false);
    renderHeader(profile);
    window.dispatchEvent(new Event("storechange"));
    UI.toast("Profile saved", "Changes are live on every page of this demo.", "success");
  }

  /* ---------------- preferences ---------------- */
  function renderPrefs() {
    var prefs = Store.getPrefs();
    qa("[data-pref]").forEach(function (box) {
      box.checked = !!prefs[box.dataset.pref];
    });
  }

  function bindPrefs() {
    qa("[data-pref]").forEach(function (box) {
      box.addEventListener("change", function () {
        var saved = Store.savePref(box.dataset.pref, box.checked);
        var badge = q("#prefsSaved");
        badge.textContent = "saved";
        badge.className = "badge badge-success";
        UI.toast(
          box.closest(".toggle-item").querySelector(".t-label").textContent,
          box.checked ? "Turned on" : "Turned off",
          box.checked ? "success" : "info"
        );
        if (box.dataset.pref === "enterToSend") {
          q("#prefsSaved").title = "Enter " + (saved.enterToSend ? "sends" : "adds a newline");
        }
        setTimeout(function () { badge.textContent = "saved"; }, 1200);
      });
    });
  }

  /* ---------------- theme segmented control ---------------- */
  function storedTheme() {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  }

  function renderTheme() {
    var choice = storedTheme();
    if (!choice) choice = "system";
    qa("#themeSeg [data-theme-choice]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.themeChoice === choice);
    });
    q("#themeNow").textContent = choice === "system"
      ? "system (" + (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") + ")"
      : choice;
  }

  function bindTheme() {
    qa("#themeSeg [data-theme-choice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var choice = btn.dataset.themeChoice;
        if (choice === "system") UI.setSystemTheme();
        else UI.setTheme(choice);
        renderTheme();
      });
    });
    window.addEventListener("themechange", renderTheme);
    if (matchMedia("(prefers-color-scheme: dark)").addEventListener) {
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
        if (!storedTheme()) renderTheme();
      });
    }
  }

  /* ---------------- init ---------------- */
  function init() {
    profile = Store.getProfile();
    draft = Object.assign({}, profile);
    fillForm(profile);
    renderHeader(profile);
    renderPrefs();
    renderTheme();

    q("#editBtn").addEventListener("click", function () {
      if (editing) {
        fillForm(draft);
        setEditing(false);
        renderHeader(profile);
      } else {
        setEditing(true);
      }
    });
    q("#cancelBtn").addEventListener("click", function () {
      fillForm(draft);
      setEditing(false);
      renderHeader(profile);
      UI.toast("Changes discarded", "The form is back to its saved state.", "info");
    });
    q("#profileForm").addEventListener("submit", save);

    qa("#tintRow [data-tint]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        profile = Store.saveProfile({ avatarTint: btn.dataset.tint });
        renderHeader(profile);
        window.dispatchEvent(new Event("storechange"));
      });
    });

    /* live preview of name while typing */
    document.getElementById("fName").addEventListener("input", function (e) {
      q("#pName").textContent = e.target.value.trim() || "Unnamed";
      q("#avatarBig").textContent = Store.initials(e.target.value || "?");
    });
    document.getElementById("fUsername").addEventListener("input", function (e) {
      q("#pHandle").textContent = e.target.value.trim() || "user";
    });

    q("#signOutBtn").addEventListener("click", function () {
      UI.toast("Signed out", "Demo session ended — refresh to come back.", "info");
    });
    q("#deleteBtn").addEventListener("click", function () {
      try { localStorage.removeItem("simpleui.profile.v1"); } catch (e) {}
      profile = Store.getProfile();
      draft = Object.assign({}, profile);
      fillForm(profile);
      setEditing(false);
      renderHeader(profile);
      window.dispatchEvent(new Event("storechange"));
      UI.toast("Profile reset", "Back to the seeded demo account.", "danger");
    });

    bindPrefs();
    bindTheme();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
