/* ==========================================================================
   user.js — read-only view of anybody's profile (user.html?u=<id>).
   The roster comes from the admin panel, so this page never edits anything:
   it only shows what the admin stored for that user.
   ========================================================================== */
(function () {
  "use strict";

  function q(id) { return document.getElementById(id); }

  function missing() {
    q("uAvatar").innerHTML = UI.avatarHTML({ name: "?", tint: "accent" }, 96, false);
    q("uName").textContent = "User not found";
    q("uUser").textContent = "—";
    q("uBio").textContent = "Is id ka koi user roster me nahi hai. Admin panel se user banaiye ya list se choose kijiye.";
    q("uHandle").textContent = "@—";
    q("uPhoto").innerHTML = "—";
    q("uRole").textContent = "—";
    q("uPresence").textContent = "—";
    q("uPresence").className = "";
    q("uMsgs").textContent = "0";
    q("uUnread").textContent = "0";
    q("uLast").innerHTML = "no thread to show<span class=" + '"sub"' + ">this id is not in the roster</span>";
    var chat = q("uChat");
    chat.classList.add("ghost");
    chat.classList.remove("yes");
    chat.textContent = "Back to users";
    chat.href = "index.html";
    document.title = "No such user · Terox Chat";
  }

  function render(u) {
    var p = UI.avatarHTML(u, 96, true);
    q("uAvatar").innerHTML = p;
    q("uName").textContent = u.name;
    q("uUser").textContent = u.username || Store.slug(u.name);

    var handle = "@" + (u.username || Store.slug(u.name));
    q("uFull").textContent = u.name;
    q("uHandle").textContent = handle;
    q("uRole").textContent = u.role || "no role set";
    q("uBio").textContent = u.bio || "nothing written yet";

    /* the photo row shows the picture itself, so the table reads like a profile card */
    q("uPhoto").innerHTML = u.photo
      ? '<img class="thumb" src="' + Store.photoSrc(u) + '" alt="" width="34" height="34" />' + u.photo +
        '<span class="sub">one image, this user only</span>'
      : 'initials only<span class="sub">no image assigned</span>';

    var th = Store.thread(u.id);
    var ms = th.messages || [];
    var last = ms.length ? ms[ms.length - 1] : null;
    q("uMsgs").textContent = ms.length;
    q("uUnread").textContent = th.unread ? th.unread : "0 \u00b7 all read";
    q("uLast").innerHTML = last
      ? Store.time(last.at) + " \u00b7 " + Store.dayStamp(last.at) +
        '<span class="sub">' + esc(last.text) + "</span>"
      : "no messages yet";

    q("uChat").href = "chat.html?u=" + encodeURIComponent(u.id);
    document.title = u.name + " \u00b7 Terox Chat";
    q("barName").textContent = u.name.split(" ")[0] + "'s profile";
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s).slice(0, 70);
    return d.innerHTML;
  }

  function init() {
    var wanted = new URLSearchParams(location.search).get("u");
    var found = null;
    if (wanted) {
      Store.users().forEach(function (u) { if (u.id === wanted) found = u; });
    }
    if (found) render(found);
    else missing();
    window.addEventListener("terox:change", function () {
      var again = null;
      Store.users().forEach(function (u) { if (wanted && u.id === wanted) again = u; });
      if (again) render(again);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
