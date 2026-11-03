/* ==========================================================================
   home.js — recent conversations, counters and the "what we reused" list.
   ========================================================================== */
(function () {
  "use strict";

  var USED = [
    { name: "Cards & buttons", where: "every page" },
    { name: "Navbar", where: "every page" },
    { name: "Badges", where: "home · chat · profile" },
    { name: "Search bar", where: "chat sidebar" },
    { name: "Toggle switch", where: "profile preferences" },
    { name: "Loader dots", where: "chat typing" },
    { name: "Tooltips", where: "chat composer" },
    { name: "Footer", where: "home" },
    { name: "Toast / alert", where: "profile save · chat" }
  ];

  var SKIPPED = [
    { name: "Tables", why: "no tabular data here" },
    { name: "Modals", why: "profile edits inline" },
    { name: "Stepper", why: "forms are single-step" },
    { name: "File uploader", why: "attachments out of scope" }
  ];

  function tick(node, to) {
    var start = performance.now();
    var dur = 700;
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      node.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(frame);
    }
    if (to > 0) requestAnimationFrame(frame);
    else node.textContent = "0";
  }

  function render() {
    var threads = Store.getThreads();
    var ids = Store.orderedIds(threads);
    var total = ids.reduce(function (n, id) { return n + threads[id].messages.length; }, 0);
    var unread = Store.totalUnread(threads);

    tick(document.querySelector('[data-stat="threads"]'), ids.length);
    tick(document.querySelector('[data-stat="messages"]'), total);
    tick(document.querySelector('[data-stat="unread"]'), unread);
    var badge = document.querySelector('[data-stat="unread-badge"]');
    badge.textContent = unread > 0 ? unread + " unread" : "all caught up";
    badge.className = "badge " + (unread > 0 ? "badge-warning" : "badge-success");

    var online = ids.filter(function (id) {
      return Store.PEOPLE[threads[id].peer].status === "online";
    }).length;
    document.getElementById("heroNote").textContent =
      online + " of " + ids.length + " people online · " + total + " messages in the local store";

    /* recent conversations */
    var list = document.getElementById("recentList");
    list.innerHTML = "";
    ids.slice(0, 4).forEach(function (id) {
      var thread = threads[id];
      var person = Store.PEOPLE[thread.peer];
      var a = document.createElement("a");
      a.className = "row";
      a.href = "chat.html?c=" + id;
      a.innerHTML =
        '<span class="avatar size-40 t-' + person.tint + '">' + Store.initials(person.name) + "</span>" +
        '<span style="min-width:0">' +
          '<span class="r-top"><span class="r-name"></span><span class="r-time"></span></span>' +
          '<span class="r-msg" style="display:block"></span>' +
        "</span>" +
        (thread.unread ? '<span class="badge badge-primary">' + thread.unread + "</span>" : '<span class="dot-status ' + (person.status === "online" ? "online" : "") + '"></span>');
      a.querySelector(".r-name").textContent = person.name;
      a.querySelector(".r-time").textContent = Store.whenLabel(Store.lastAt(threads, id));
      a.querySelector(".r-msg").textContent = Store.preview(threads, id);
      list.appendChild(a);
    });

    /* reused / skipped component lists */
    var ul = document.getElementById("usedList");
    ul.innerHTML = "";
    USED.forEach(function (c) {
      var li = document.createElement("li");
      li.innerHTML =
        '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>' +
        "<span><b>" + c.name + "</b> — " + c.where + "</span>";
      ul.appendChild(li);
    });
    SKIPPED.forEach(function (c) {
      var li = document.createElement("li");
      li.innerHTML =
        '<svg class="cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        "<span><b>" + c.name + "</b> — skipped: " + c.why + "</span>";
      ul.appendChild(li);
    });

    /* the "components reused" stat is derived from the same list, never hardcoded */
    var reuse = document.querySelector('[data-stat="reused"]');
    if (reuse) {
      reuse.textContent = USED.length;
      reuse.closest(".stat").querySelector(".foot").innerHTML =
        '<span class="badge badge-secondary">' + USED.length + " used · " + SKIPPED.length + " skipped</span> of 14 groups";
    }
  }

  function init() {
    render();

    var reset = document.querySelector('[data-action="reset-demo"]');
    if (reset) {
      reset.addEventListener("click", function (e) {
        e.preventDefault();
        Store.resetThreads();
        localStorage.removeItem("simpleui.profile.v1");
        localStorage.removeItem("simpleui.prefs.v1");
        UI.hydrateChrome();
        render();
        UI.toast("Demo data reset", "Threads and preferences are back to their seed state.", "info");
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
