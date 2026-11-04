/* ==========================================================================
   home.js — the user list. Roster comes from the admin panel (Store.users),
   every contact is online, newest activity first. Tapping the face opens that
   profile, tapping the rest of the row opens the chat.
   ========================================================================== */
(function () {
  "use strict";

  var filter = "";

  function matches(u) {
    if (!filter) return true;
    var t = Store.last(Store.chats(), u.id);
    var hay = [u.name, u.username, u.role, u.bio, t ? t.text : ""].join(" ").toLowerCase();
    return hay.indexOf(filter.toLowerCase()) !== -1;
  }

  function render() {
    var all = Store.chats();
    var list = document.getElementById("userList");
    var roster = Store.users();

    var rows = roster.slice().sort(function (a, b) {
      return Store.lastAt(all, b.id) - Store.lastAt(all, a.id);
    }).filter(matches);

    var online = document.querySelector("[data-online]");
    if (online) online.textContent = String(roster.length);

    list.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = roster.length
        ? '<p class="empty">Koi user nahi mila — "' + escapeHtml(filter) + '"</p>'
        : '<p class="empty">Abhi koi user nahi. Admin panel se banaiye — <a href="admin/index.html">open admin</a>.</p>';
      return;
    }

    rows.forEach(function (u) {
      var last = Store.last(all, u.id);
      var unread = (all[u.id] && all[u.id].unread) || 0;

      var row = document.createElement("div");
      row.className = "urow" + (unread ? " unread" : "");
      row.dataset.uid = u.id;
      row.setAttribute("role", "listitem");
      row.innerHTML =
        '<a class="face" href="user.html?u=' + encodeURIComponent(u.id) + '" aria-label="View profile: ' + escapeHtml(u.name) + '">' +
          UI.avatarHTML(u, 48, true) +
        "</a>" +
        '<a class="main" href="chat.html?u=' + encodeURIComponent(u.id) + '">' +
          '<span class="n"><b></b><time></time></span>' +
          '<span class="p"><span class="pv"></span>' +
            (unread ? '<span class="badge-count">' + unread + "</span>" : '<span class="st"><span class="dot-status online"></span>Online</span>') +
          "</span>" +
        "</a>";

      row.querySelector(".n b").textContent = u.name;
      row.querySelector("time").textContent = last ? Store.rowStamp(last.at) : "";
      row.querySelector(".pv").textContent = last
        ? (last.from === "me" ? "You: " : "") + last.text
        : (u.bio || u.role || "@" + u.username) + " · tap to chat";
      list.appendChild(row);
    });

    /* keep ids referenced so future server data can swap in */
    list.dataset.ids = roster.map(function (u) { return u.id; }).join(",");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function init() {
    render();

    var search = document.getElementById("userSearch");
    var clear = document.getElementById("searchClear");
    if (search) {
      search.addEventListener("input", function () {
        filter = search.value.trim();
        if (clear) clear.hidden = !filter;
        render();
      });
      search.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { search.value = ""; filter = ""; if (clear) clear.hidden = true; render(); }
      });
    }
    if (clear) {
      clear.addEventListener("click", function () {
        search.value = ""; filter = ""; clear.hidden = true;
        render(); search.focus();
      });
    }
    window.addEventListener("terox:change", render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
