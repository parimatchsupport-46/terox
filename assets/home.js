/* ==========================================================================
   home.js — the user list. All users, all online, newest activity first.
   ========================================================================== */
(function () {
  "use strict";

  var filter = "";

  function render() {
    var all = Store.chats();
    var list = document.getElementById("userList");
    var ids = Store.USERS.map(function (u) { return u.id; });

    var rows = Store.USERS.slice().sort(function (a, b) {
      return Store.lastAt(all, b.id) - Store.lastAt(all, a.id);
    }).filter(function (u) {
      if (!filter) return true;
      var t = Store.last(all, u.id);
      var hay = (u.name + " " + u.role + " " + (t ? t.text : "")).toLowerCase();
      return hay.indexOf(filter.toLowerCase()) !== -1;
    });

    var online = document.querySelector("[data-online]");
    if (online) online.textContent = String(Store.USERS.length);

    list.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = '<p class="empty">Koi user nahi mila — "' + escapeHtml(filter) + '"</p>';
      return;
    }

    rows.forEach(function (u) {
      var last = Store.last(all, u.id);
      var unread = (all[u.id] && all[u.id].unread) || 0;

      var a = document.createElement("a");
      a.className = "urow" + (unread ? " unread" : "");
      a.href = "chat.html?u=" + u.id;
      a.dataset.uid = u.id;
      a.setAttribute("role", "listitem");
      a.innerHTML =
        '<span class="avatar s48 t-' + u.tint + '">' + Store.initials(u.name) + '<span class="live"></span></span>' +
        '<span class="mid">' +
          '<span class="n"><b></b><time></time></span>' +
          '<span class="p"><span class="pv"></span>' +
            (unread ? '<span class="badge-count">' + unread + "</span>" : '<span class="st"><span class="dot-status online"></span>Online</span>') +
          "</span>" +
        "</span>";

      a.querySelector(".n b").textContent = u.name;
      a.querySelector("time").textContent = last ? Store.rowStamp(last.at) : "";
      a.querySelector(".pv").textContent = last
        ? (last.from === "me" ? "You: " : "") + last.text
        : u.role + " · tap to chat";
      list.appendChild(a);
    });

    /* keep ids referenced so future server data can swap in */
    list.dataset.ids = ids.join(",");
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
