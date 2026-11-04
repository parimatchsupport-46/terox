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
    q("uRole").textContent = "—";
    q("uBio").textContent = "Is id ka koi user roster me nahi hai. Admin panel se user banaiye ya list se choose kijiye.";
    q("uHandle").textContent = "@—";
    q("uPhoto").textContent = "—";
    q("uStat").textContent = "—";
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
    q("uUser").textContent = (u.username || Store.slug(u.name)) ? "@" + (u.username || Store.slug(u.name)) : "\u2014";
    q("uRole").textContent = u.role || "no role set";
    q("uHandle").textContent = "@" + (u.username || Store.slug(u.name));
    q("uBio").textContent = u.bio || "No bio yet — the admin has not filled this in.";
    q("uPhoto").textContent = u.photo ? u.photo + " · from the avatar pool" : "no image, initials only";

    var t = Store.thread(u.id);
    var last = t.messages.length ? t.messages[t.messages.length - 1] : null;
    q("uStat").textContent = t.messages.length
      ? t.messages.length + (t.messages.length === 1 ? " message" : " messages") +
        " · last at " + Store.time(last.at) + ", " + Store.dayStamp(last.at)
      : "no messages yet";

    q("uChat").href = "chat.html?u=" + encodeURIComponent(u.id);
    document.title = u.name + " · Terox Chat";
    q("barName").textContent = u.name.split(" ")[0] + "'s profile";
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
