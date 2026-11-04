/* ==========================================================================
   profile.js — identity (name / username / phone / status), avatar tint,
   chat preferences, and the local-data controls.
   ========================================================================== */
(function () {
  "use strict";

  var FIELDS = ["name", "username", "phone", "bio"];
  var TINTS = ["accent", "yes", "no", "warn"];
  var editing = false;
  var saved = {};

  function q(id) { return document.getElementById(id); }
  function input(name) { return q("f" + name.charAt(0).toUpperCase() + name.slice(1)); }

  function renderHead(p) {
    var tint = TINTS.indexOf(p.tint) > -1 ? p.tint : "accent";
    var av = q("pAvatar");
    av.className = "avatar s72 t-" + tint;
    av.innerHTML = Store.initials(p.name) + '<span class="live"></span>';
    q("pName").textContent = p.name;
    q("pUser").textContent = p.username;
    q("pPhone").textContent = p.phone || "No phone added";

    /* the same four values as a read-only table; the inputs only appear in edit mode */
    q("vName").textContent = p.name || "—";
    q("vUser").textContent = "@" + (p.username || "—");
    q("vPhone").textContent = p.phone || "not added";
    q("vBio").textContent = p.bio || "no status set";

    document.querySelectorAll("#tints button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.tint === tint));
    });

    var all = Store.chats();
    var threads = Object.keys(all).length;
    var msgs = Object.keys(all).reduce(function (n, id) { return n + all[id].messages.length; }, 0);
    var unread = Store.unreadTotal();
    q("chatStat").textContent = "everything stays on this phone";
    q("cThreads").textContent = threads;
    q("cMsgs").textContent = msgs;
    q("cUnread").textContent = unread ? unread : "0 · all read";
    var bytes = 0;
    try {
      ["terox.users.v1", "terox.chats.v1", "terox.prefs.v1", "terox.profile.v1",
       "terox.accounts.v1", "terox.session.v1"].forEach(function (k) {
        bytes += (localStorage.getItem(k) || "").length;
      });
    } catch (e) {}
    q("cBytes").innerHTML = (bytes / 1024).toFixed(1) + " KB in local storage" +
      '<span class="sub">no server, no database</span>';
  }

  function fill(v) {
    FIELDS.forEach(function (f) {
      input(f).value = v[f] == null ? "" : v[f];
    });
  }

  function setMode(on) {
    editing = on;
    FIELDS.forEach(function (f) { input(f).disabled = !on; });
    q("pTable").hidden = on;
    q("pEdit").hidden = !on;
    q("formActions").hidden = !on;
    q("editBtn").textContent = on ? "Cancel" : "Edit";
    q("aboutHint").textContent = on ? "Save to apply across the app" : "Shown to everyone in your chat list";
  }

  function save(e) {
    e.preventDefault();
    var patch = {};
    FIELDS.forEach(function (f) {
      var el = input(f);
      patch[f] = String(el.value).replace(/\s+/g, f === "bio" ? " " : " ").trim();
    });

    if (!patch.name) { UI.toast("Name is required", "bad"); input("name").focus(); return; }
    if (!patch.bio) { UI.toast("Status cannot be empty", "bad"); input("bio").focus(); return; }
    if (patch.phone && !/^[+0-9 ()-]{7,20}$/.test(patch.phone)) {
      UI.toast("Phone number looks off", "bad"); input("phone").focus(); return;
    }
    patch.username = String(patch.username).toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!patch.username) { UI.toast("Username needs letters or numbers", "bad"); input("username").focus(); return; }

    saved = Store.saveProfile(patch);
    fill(saved);
    setMode(false);
    renderHead(saved);
    UI.toast("Profile saved", "ok");
  }

  function init() {
    saved = Store.profile();
    fill(saved);
    renderHead(saved);

    var prefs = Store.prefs();
    document.querySelectorAll("[data-pref]").forEach(function (box) {
      box.checked = !!prefs[box.dataset.pref];
      box.addEventListener("change", function () {
        Store.savePref(box.dataset.pref, box.checked);
        UI.toast(
          box.closest(".toggle-item").querySelector(".tl").textContent + (box.checked ? " on" : " off"),
          box.checked ? "ok" : "info"
        );
      });
    });

    q("editBtn").addEventListener("click", function () {
      if (editing) { fill(saved); setMode(false); }
      else setMode(true);
    });
    q("cancelBtn").addEventListener("click", function () { fill(saved); setMode(false); });
    q("profileForm").addEventListener("submit", save);

    /* live preview while typing */
    input("name").addEventListener("input", function () {
      q("pName").textContent = input("name").value.trim() || "—";
      q("pAvatar").innerHTML = Store.initials(input("name").value || "?") + '<span class="live"></span>';
    });
    input("username").addEventListener("input", function () {
      q("pUser").textContent = input("username").value.trim() || "—";
    });
    input("phone").addEventListener("input", function () {
      q("pPhone").textContent = input("phone").value.trim() || "No phone added";
    });

    document.querySelectorAll("#tints button").forEach(function (b) {
      b.addEventListener("click", function () {
        saved = Store.saveProfile({ tint: b.dataset.tint });
        renderHead(saved);
      });
    });

    q("resetProfile").addEventListener("click", function () {
      var prev = Store.profile();
      try { localStorage.removeItem("terox.profile.v1"); } catch (e) {}
      saved = Store.profile();
      fill(saved);
      renderHead(saved);
      UI.hydrate();
      UI.toast("Profile reset", "info", {
        label: "Undo",
        onClick: function () { Store.saveProfile(prev); saved = Store.profile(); fill(saved); renderHead(saved); UI.hydrate(); }
      });
    });

    q("clearChats").addEventListener("click", function () {
      var snapshot = null;
      try { snapshot = localStorage.getItem("terox.chats.v1"); } catch (e) {}
      Store.clearAll();
      renderHead(Store.profile());
      UI.hydrate();
      UI.toast("All chats deleted", "bad", {
        label: "Undo",
        onClick: function () {
          if (!snapshot) return;
          try { localStorage.setItem("terox.chats.v1", snapshot); } catch (e) {}
          renderHead(Store.profile());
          UI.hydrate();
          UI.toast("Chats restored", "ok");
        }
      });
    });

    renderAccount();
    document.addEventListener("terox:accounts", renderAccount);

    window.addEventListener("terox:change", function () { renderHead(Store.profile()); });
  }

  /* the gate owns the name and number shown up here, so the profile screen reports
     what it is signed in as and offers the way out */
  function renderAccount() {
    var stat = q("acctStat"), note = q("acctNote"), btn = q("signOutBtn");
    if (!stat || !window.Auth) return;
    var acc = Auth.current();
    var all = Auth.accounts();
    var count = q("acctCount");
    stat.textContent = acc ? Auth.pretty(acc.mobile) : "not signed in";
    if (count) count.textContent = all.length ? all.length + (all.length === 1 ? " account" : " accounts") + " on this device" : "none yet";
    if (btn) btn.hidden = !acc;
    if (note) {
      note.innerHTML = (acc
        ? (all.length > 1 ? "Pick another of the " + all.length + " numbers on the sign-in screen" : "The same number, or log out and use another")
        : "Register with a name and a number") + '<span class="sub">no password, no server, no sync</span>';
    }
    if (btn && !btn.wired) {
      btn.wired = true;
      btn.addEventListener("click", function () {
        Auth.signOut();
        location.replace("login.html");
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
