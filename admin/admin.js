/* ==========================================================================
   admin.js — create / edit / delete the users that appear on the chat home
   page. Only three fields are typed in (name, username, bio); the profile
   photo is never a URL — it is taken from the image pool in assets/avatars,
   and a file once given to a user is never handed to another.
   ========================================================================== */
(function () {
  "use strict";

  var editingId = null;      /* null = creating */
  var photoPick = undefined; /* undefined = auto, null = no photo, "aNN.jpg" = chosen */
  var userTouched = false;
  var filter = "";

  function q(id) { return document.getElementById(id); }
  var f = {
    name: q("fName"), user: q("fUser"), bio: q("fBio"),
    eName: q("eName"), eUser: q("eUser"), hUser: q("hUser"), hBio: q("hBio"),
    title: q("formTitle"), save: q("saveBtn"),
    pName: q("pName"), pNote: q("pNote"), pPrev: q("pPreview")
  };

  /* ---------------- the pool ---------------- */
  function roster() { return Store.users(); }
  function taken(exceptId) {
    var map = {};
    roster().forEach(function (u) { if (u.photo && u.id !== exceptId) map[u.photo] = u.id; });
    return map;
  }
  function nextFree(exceptId) {
    var used = taken(exceptId);
    for (var i = 0; i < Store.AVATARS.length; i++) {
      if (!used[Store.AVATARS[i]]) return { name: Store.AVATARS[i], index: i + 1 };
    }
    return null;
  }
  function chosenPhoto() {
    if (photoPick === null) return null;
    if (photoPick) return photoPick;
    var free = nextFree(editingId);
    return free ? free.name : null;
  }

  /* ---------------- render ---------------- */
  function renderMeters() {
    var list = roster();
    var used = Object.keys(Store.usedPhotos(list)).length;
    q("mUsers").textContent = String(list.length);
    q("mUsed").textContent = String(used);
    q("mPool").textContent = String(Store.AVATARS.length);
    q("mUsed").parentNode.classList.toggle("full", Store.AVATARS.length - used === 0);
  }

  function renderPhoto() {
    var name = chosenPhoto();
    var preview = { name: f.name.value.trim() || "New User", photo: name, tint: "accent" };
    f.pPrev.innerHTML = UI.avatarHTML(preview, 56, false);
    if (!name) {
      f.pName.textContent = "no photo";
      f.pNote.textContent = nextFree(editingId)
        ? "initials only — pick an image to override"
        : "the pool is empty, so this user keeps initials";
      return;
    }
    var idx = Store.AVATARS.indexOf(name) + 1;
    f.pName.textContent = name;
    f.pNote.textContent = "image " + idx + " of " + Store.AVATARS.length +
      " · free for this user, nobody else has it";
  }

  function renderForm() {
    renderPhoto();
    f.title.textContent = editingId ? "Edit user" : "Create user";
    f.save.textContent = editingId ? "Save changes" : "Create user";
  }
  function showSheet() { q("formScrim").hidden = false; document.body.classList.add("form-open"); }
  function hideSheet() { q("formScrim").hidden = true; document.body.classList.remove("form-open"); }

  function renderList() {
    var list = roster();
    var ul = q("list");
    var used = 0;
    ul.innerHTML = "";

    var rows = list.filter(function (u) {
      if (!filter) return true;
      return (u.name + " " + u.username + " " + (u.bio || "")).toLowerCase().indexOf(filter) !== -1;
    });
    list.forEach(function (u) { if (u.photo) used += 1; });

    q("listCount").textContent = rows.length === list.length
      ? list.length + (list.length === 1 ? " user" : " users")
      : rows.length + " of " + list.length + " users";

    if (!rows.length) {
      ul.className = "adm-list card empty-state";
      ul.innerHTML = list.length
        ? "No user matches “" + esc(filter) + "”."
        : "No users yet — create the first one and it shows up on the chat home page.";
      return;
    }
    ul.className = "adm-list card";

    rows.forEach(function (u) {
      var li = document.createElement("li");
      li.className = "u-line";
      li.dataset.uid = u.id;
      li.innerHTML =
        UI.avatarHTML(u, 44, true) +
        '<div class="info"><b></b><span class="u"></span><p></p>' +
          '<span class="tag' + (u.photo ? "" : " none") + '"></span>' +
        "</div>" +
        '<div class="acts">' +
          '<button class="btn ghost sm" type="button" data-act="view">View</button>' +
          '<button class="btn ghost sm" type="button" data-act="edit">Edit</button>' +
          '<button class="btn no sm" type="button" data-act="del">Delete</button>' +
        "</div>";
      li.querySelector(".info b").textContent = u.name;
      li.querySelector(".info .u").textContent = "@" + (u.username || Store.slug(u.name));
      li.querySelector(".info p").textContent = u.bio || "no bio yet";
      var freeLeft = Store.AVATARS.length - Object.keys(Store.usedPhotos(list)).length;
      var tag = li.querySelector(".tag");
      if (u.photo) tag.textContent = "photo " + u.photo;
      else if (freeLeft > 0) { tag.textContent = "no photo · " + freeLeft + " free in the pool"; tag.classList.remove("none"); }
      else { tag.textContent = "pool empty · initials only"; }

      li.querySelector('[data-act="view"]').addEventListener("click", function () {
        window.open("../user.html?u=" + encodeURIComponent(u.id), "_blank");
      });
      li.querySelector('[data-act="edit"]').addEventListener("click", function () { openEdit(u.id); });
      li.querySelector('[data-act="del"]').addEventListener("click", function () { del(u.id); });
      ul.appendChild(li);
    });
  }

  function render() { renderMeters(); renderList(); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------------- form open / close ---------------- */
  function openNew() {
    editingId = null;
    photoPick = undefined;
    userTouched = false;
    f.name.value = "";
    f.user.value = "";
    f.bio.value = "";
    clearErrors();
    f.hUser.textContent = "letters, numbers and _ only — must be unique";
    renderForm();
    showSheet();
    f.name.focus();
  }

  function openEdit(id) {
    var u = Store.user(id);
    if (!u) return;
    editingId = id;
    photoPick = u.photo || null;
    userTouched = true;
    f.name.value = u.name;
    f.user.value = u.username || "";
    f.bio.value = u.bio || "";
    clearErrors();
    renderForm();
    showSheet();
    f.name.focus();
    if (window.innerWidth < 940) q("uForm").scrollIntoView({ block: "nearest" });
  }

  function closeForm() {
    editingId = null;
    photoPick = undefined;
    hideSheet();
  }

  /* ---------------- validation ---------------- */
  function clearErrors() {
    f.eName.hidden = true;
    f.eUser.hidden = true;
  }
  function bad(el, msg) {
    el.textContent = msg;
    el.hidden = false;
  }
  function suggestUser(name) {
    var base = Store.slug(name).slice(0, 20);
    var cand = base, n = 2;
    var mine = roster().filter(function (u) { return u.id !== editingId; });
    var takenNames = {};
    mine.forEach(function (u) { takenNames[u.username] = 1; });
    while (takenNames[cand]) { cand = base + n; n += 1; }
    return cand;
  }
  function validate() {
    var name = f.name.value.trim();
    var user = f.user.value.trim().replace(/^@/, "");
    var ok = true;
    clearErrors();

    if (name.length < 2) { bad(f.eName, "Name needs at least 2 characters."); ok = false; }
    else if (name.length > 40) { bad(f.eName, "Name is too long (40 max)."); ok = false; }

    if (!/^[a-z0-9_]{3,20}$/.test(user)) {
      bad(f.eUser, "3-20 characters: a-z, 0-9 or _ only.");
      ok = false;
    } else {
      var clash = roster().some(function (u) { return u.id !== editingId && u.username === user; });
      if (clash) { bad(f.eUser, "@" + user + " is already taken by another user."); ok = false; }
    }
    if (f.bio.value.length > 160) { bad(f.eUser, "Bio is 160 characters max."); ok = false; }
    f.hBio.textContent = f.bio.value.length + " / 160";
    return ok ? { name: name, username: user, bio: f.bio.value.trim() } : null;
  }

  /* ---------------- save / delete ---------------- */
  function submit(e) {
    if (e) e.preventDefault();
    var data = validate();
    if (!data) { UI.toast("Fix the highlighted fields", "bad"); return; }
    data.photo = chosenPhoto();

    if (editingId) {
      var before = Store.user(editingId);
      var snapshot = roster().map(function (u) { return u; });
      Store.updateUser(editingId, data);
      render();
      closeForm();
      UI.toast(data.name + " updated", "ok", {
        label: "Undo",
        onClick: function () { Store.saveUsers(snapshot); render(); }
      });
      return;
    }
    var u = Store.addUser(data);
    render();
    closeForm();
    UI.toast(u.name + " created with " + (u.photo ? u.photo : "initials") + " — live on the home list", "ok", {
      label: "Undo",
      onClick: function () { Store.removeUser(u.id); render(); }
    });
  }

  function del(id) {
    var gone = Store.removeUser(id);
    if (!gone) return;
    render();
    if (editingId === id) closeForm();
    UI.toast(gone.name + " removed — image " + (gone.photo || "—") + " is back in the pool", "ok", {
      label: "Undo",
      onClick: function () {
        var list = roster().slice();
        list.push(gone);
        Store.saveUsers(list);
        render();
      }
    });
  }

  /* ---------------- export / import / reset ---------------- */
  function exportJSON() {
    var json = JSON.stringify(roster(), null, 2) + "\n";
    var a = document.createElement("a");
    try {
      a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    } catch (e) {
      a.href = "data:application/json," + encodeURIComponent(json);
    }
    a.download = "users.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (/^blob:/.test(a.href)) URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
    UI.toast("users.json exported — drop it in data/users.json", "ok");
  }

  function importJSON(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var arr = JSON.parse(fr.result);
        if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
        var seen = {};
        arr.forEach(function (u) {
          if (!u.name || !u.username) throw new Error("fields");
          if (seen[u.photo]) throw new Error("duplicate image: " + u.photo);
          if (u.photo) seen[u.photo] = 1;
        });
        Store.saveUsers(arr);
        render();
        UI.toast(arr.length + " users imported", "ok");
      } catch (err) {
        UI.toast("That file is not a Terox users.json array", "bad");
      }
    };
    fr.readAsText(file);
  }

  /* ---------------- boot ---------------- */
  function init() {
    render();
    renderForm();          /* the photo preview is useful before anyone is being edited */
    q("newBtn").addEventListener("click", openNew);
    q("cancelBtn").addEventListener("click", closeForm);
    q("formClose").addEventListener("click", closeForm);
    q("formScrim").addEventListener("click", closeForm);
    q("uForm").addEventListener("submit", submit);
    q("pNext").addEventListener("click", function () {
      var free = nextFree(editingId);
      if (!free) { UI.toast("Every image in the pool is already used", "bad"); return; }
      photoPick = editingId && !chosenPhoto()
        ? free.name
        : (function () {
            var i = Store.AVATARS.indexOf(chosenPhoto());
            for (var k = i + 1; k < Store.AVATARS.length; k++) {
              if (!taken(editingId)[Store.AVATARS[k]]) return Store.AVATARS[k];
            }
            return free.name;
          })();
      renderForm();
    });
    q("pNone").addEventListener("click", function () { photoPick = null; renderForm(); });
    q("exportBtn").addEventListener("click", exportJSON);
    q("importBtn").addEventListener("click", function () { q("importFile").click(); });
    q("importFile").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) importJSON(e.target.files[0]);
      e.target.value = "";
    });
    q("resetBtn").addEventListener("click", function () {
      var snapshot = roster().map(function (u) { return u; });
      Store.resetUsers();
      render();
      UI.toast("Roster reset to the shipped data/users.json", "ok", {
        label: "Undo",
        onClick: function () { Store.saveUsers(snapshot); render(); }
      });
    });

    f.name.addEventListener("input", function () {
      if (!userTouched) f.user.value = suggestUser(f.name.value);
      renderForm();
    });
    f.user.addEventListener("input", function () { userTouched = true; });
    f.bio.addEventListener("input", function () { f.hBio.textContent = f.bio.value.length + " / 160"; });
    q("q").addEventListener("input", function (e) { filter = e.target.value.trim().toLowerCase(); renderList(); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("form-open")) closeForm();
    });
    window.addEventListener("terox:change", render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
