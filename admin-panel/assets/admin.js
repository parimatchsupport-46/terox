/* ==========================================================================
   admin.js — create / edit / delete the users that appear on the chat home
   page. Only three fields are typed in (name, username, bio); the profile
   photo is never a URL — it is taken from the image pool in assets/avatars,
   and a file once given to a user is never handed to another.
   ========================================================================== */
(function () {
  "use strict";

  var editingId = null;      /* null = creating */
  /* photoPick: undefined = keep/auto, null = none, {kind:"pool",file}, {kind:"file",url,path,bytes} */
  var photoPick = undefined;
  var uploading = false;
  var userTouched = false;
  var filter = "";

  function q(id) { return document.getElementById(id); }
  var f = {
    name: q("fName"), user: q("fUser"), bio: q("fBio"),
    eName: q("eName"), eUser: q("eUser"), hUser: q("hUser"), hBio: q("hBio"),
    title: q("formTitle"), save: q("saveBtn"),
    pName: q("pName"), pNote: q("pNote"), pPrev: q("pPreview"),
    pFile: q("pFile"), pDrop: q("pDrop"), ePhoto: q("pErr"), pPoolNote: q("pPoolNote"),
    chip: q("fbChip"), chipText: q("fbChipText"), authBtn: q("fbAuthBtn"), lock: q("fbLock")
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
  function pickedFor(u) {
    if (u.photoURL) return { kind: "file", url: u.photoURL, path: u.photoPath || null, bytes: 0, stored: true };
    if (u.photo) return { kind: "pool", file: u.photo };
    return null;
  }
  function photoData() {
    var p = photoPick === undefined ? (function () {
      if (editingId) { var cur = Store.user(editingId); var had = cur ? pickedFor(cur) : null; if (had) return had; }
      var free = nextFree(editingId);
      return free ? { kind: "pool", file: free.name } : null;
    })() : photoPick;
    if (!p) return { photo: null, photoURL: null, photoPath: null };
    if (p.kind === "pool") return { photo: p.file, photoURL: null, photoPath: null };
    return { photo: null, photoURL: p.url, photoPath: p.path || null };
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

  function currentPick() {
    if (photoPick !== undefined) return photoPick;
    if (editingId) { var cur = Store.user(editingId); if (cur) return pickedFor(cur); return null; }
    var free = nextFree(editingId);
    return free ? { kind: "pool", file: free.name } : null;
  }

  function renderPhoto() {
    var p = currentPick();
    var name = f.name.value.trim() || "New User";
    var preview = p && p.kind === "pool" ? { name: name, photo: p.file, tint: "accent" } : { name: name, photoURL: p && p.kind === "file" ? p.url : null, tint: "accent" };
    f.pPrev.innerHTML = p && p.kind === "file"
      ? '<img src="' + p.url + '" alt="">'
      : UI.avatarHTML(preview, 60, false);
    var freeLeft = Store.AVATARS.length - Object.keys(Store.usedPhotos(roster())).length;
    f.pPoolNote.textContent = p && p.kind === "file" ? "" : freeLeft + " of " + Store.AVATARS.length + " pool images still free";

    if (uploading) { f.pName.textContent = "reading the file…"; f.pNote.textContent = "cropping to a 360px square"; return; }
    if (!p) {
      f.pName.textContent = "no image yet";
      f.pNote.textContent = "click the box to choose a JPG, PNG or WebP — or take one from the pool";
      return;
    }
    if (p.kind === "pool") {
      var idx = Store.AVATARS.indexOf(p.file) + 1;
      f.pName.textContent = p.file + " (from the pool)";
      f.pNote.textContent = "image " + idx + " of " + Store.AVATARS.length + " · nobody else has it" +
        (editingId ? "" : ", and it is this user's alone");
      return;
    }
    f.pName.textContent = p.stored ? "stored image" : "your upload";
    f.pNote.textContent = (p.bytes ? Math.round(p.bytes / 1024) + " KB after cropping · " : "") +
      (p.path ? "Firebase Storage at " + p.path : "kept in this browser only — connect Firebase to store it");
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

    /* the header already states the total, so this only appears while filtering */
    q("listCount").textContent = rows.length === list.length
      ? ""
      : rows.length + " of " + list.length + (list.length === 1 ? " match" : " match");

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
        /* the user panel is a sibling folder on the Pages site; when this panel is
           deployed on its own, set window.TEROX_APP_BASE to its public URL */
        var base = window.TEROX_APP_BASE || (location.pathname.indexOf("/admin-panel/") > -1 ? "../user-panel/" : "../");
        window.open(base + "user.html?u=" + encodeURIComponent(u.id), "_blank");
      });
      li.querySelector('[data-act="edit"]').addEventListener("click", function () { openEdit(u.id); });
      li.querySelector('[data-act="del"]').addEventListener("click", function () { del(u.id); });
      ul.appendChild(li);
    });
  }

  /* the cloud chip and the publish row report state too, so they refresh with the list */
  function render() { renderMeters(); renderList(); renderCloud(); }

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
    f.pFile.value = "";
    f.name.value = "";
    f.user.value = "";
    f.bio.value = "";
    clearErrors();
    f.ePhoto.hidden = true;
    f.hUser.textContent = "letters, numbers and _ only — must be unique";
    renderForm();
    showSheet();
    f.name.focus();
  }

  function openEdit(id) {
    var u = Store.user(id);
    if (!u) return;
    editingId = id;
    photoPick = undefined;      /* keep whatever that user already has */
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
    if (uploading) { UI.toast("Still reading that image, one moment", "bad"); return; }
    var ph = photoData();
    data.photo = ph.photo; data.photoURL = ph.photoURL; data.photoPath = ph.photoPath;

    if (editingId) {
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

  function takeFile(file) {
    if (!window.FB || !FB.uploadPhoto) { f.ePhoto.textContent = "the upload layer is not loaded"; f.ePhoto.hidden = false; return; }
    uploading = true;
    f.ePhoto.hidden = true;
    renderPhoto();
    var handle = f.user.value.trim() || Store.slug(f.name.value);
    FB.uploadPhoto(file, handle || "user").then(function (r) {
      uploading = false;
      photoPick = { kind: "file", url: r.url, path: r.path || null, bytes: r.bytes, stored: r.where === "storage" };
      renderPhoto();
      UI.toast(r.where === "storage" ? "image stored in Firebase Storage" : "image kept in this browser — connect Firebase to store it", "ok");
    }).catch(function (e) {
      uploading = false;
      f.pFile.value = "";
      f.ePhoto.textContent = e.message || "that file could not be used";
      f.ePhoto.hidden = false;
      renderPhoto();
    });
  }

  /* ---------------- cloud status ---------------- */
  function renderCloud() {
    if (!window.FB) return;
    var st = FB.state(), live = st === "ready", in_ = live && FB.signedIn();
    f.chip.setAttribute("data-state", st);
    f.chipText.textContent = st === "ready"
      ? (in_ ? "Firestore · signed in" : "Firestore · sign in to write")
      : st === "connecting" ? "connecting…"
      : st === "error" ? "device only (Firebase unreachable)"
      : "this device only";
    f.authBtn.hidden = !live || in_;
    f.authBtn.textContent = "Sign in";
    f.lock.hidden = !(live && !in_);
    /* when the read itself is refused, say why - "connected" alone would be a lie */
    var trouble = live && FB.reason ? FB.reason() : "";
    q("fbStateLine").textContent = st === "ready"
      ? "connected to " + (FB.config() || {}).projectId + (in_ ? " — signed in as " + FB.signedIn().email : " — read access only") +
        (trouble ? " · " + trouble : "")
      : st === "error" ? "error: " + FB.reason()
      : "not connected — the roster lives in this browser";
    /* a connected-but-empty project is the one state where the roster is still
       only on this device - say so, and offer to send it up */
    var empty = live && Store.cloudEmpty();
    q("fbPublishRow").hidden = !empty;
    if (empty) {
      q("fbPublishNote").textContent = "teroxUsers is empty, so the " + Store.users().length +
        " users on this device have not been stored yet." + (in_ ? "" : " Sign in first — the rules refuse anonymous writes.");
    }
  }

  function wireCloud() {
    if (!window.FB) return;
    FB.on(renderCloud);
    f.chip.addEventListener("click", function () {
      q("fbModal").hidden = false;
      if (FB.config()) q("fbSnippet").value = "const firebaseConfig = " + JSON.stringify(FB.config(), null, 2) + ";";
      q("fbSnippet").focus();
    });
    q("fbClose").addEventListener("click", function () { q("fbModal").hidden = true; });
    q("fbModal").addEventListener("click", function (e) { if (e.target === q("fbModal")) q("fbModal").hidden = true; });
    q("fbSave").addEventListener("click", function () {
      var parsed = FB.parseSnippet(q("fbSnippet").value);
      if (parsed.error) { q("fbErr").textContent = "could not read a config: " + parsed.error; q("fbErr").hidden = false; return; }
      q("fbErr").hidden = true;
      FB.setConfig(parsed.config);
      FB.connect(true).then(function () { renderCloud(); UI.toast("connecting to " + parsed.config.projectId, "ok"); });
    });
    q("fbFile").addEventListener("click", function () {
      var parsed = FB.parseSnippet(q("fbSnippet").value);
      if (parsed.error) { q("fbErr").textContent = parsed.error; q("fbErr").hidden = false; return; }
      var a = document.createElement("a");
      a.href = "data:text/javascript;charset=utf-8," + encodeURIComponent(FB.configFile(parsed.config));
      a.download = "firebase-config.js";
      document.body.appendChild(a); a.click(); a.remove();
      UI.toast("drop it at assets/firebase-config.js and commit", "ok");
    });
    q("fbPublish").addEventListener("click", function () {
      var btn = q("fbPublish");
      btn.disabled = true;
      Store.publishRoster().then(function (n) {
        UI.toast(n + " users sent to Firestore — the roster is shared now", "ok");
        renderCloud();
      }, function (e) {
        UI.toast(e.message || "Firestore refused the write", "bad");
      }).then(function () { btn.disabled = false; });
    });
    q("fbOff").addEventListener("click", function () { FB.clearConfig(); q("fbModal").hidden = true; renderCloud(); UI.toast("back to this device only", "ok"); });
    f.authBtn.addEventListener("click", function () { q("authModal").hidden = false; q("authEmail").focus(); });
    q("authClose").addEventListener("click", function () { q("authModal").hidden = true; });
    q("authModal").addEventListener("click", function (e) { if (e.target === q("authModal")) q("authModal").hidden = true; });
    q("authGo").addEventListener("click", function () {
      q("authErr").hidden = true;
      FB.signIn(q("authEmail").value, q("authPass").value).then(function () {
        q("authModal").hidden = true; q("authPass").value = "";
        renderCloud();
        UI.toast("signed in — the roster is now shared through Firestore", "ok");
      }).catch(function (e) { q("authErr").textContent = e.message || "sign-in failed"; q("authErr").hidden = false; renderCloud(); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { q("fbModal").hidden = true; q("authModal").hidden = true; }
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
    wireCloud();
    renderForm();          /* the photo preview is useful before anyone is being edited */
    q("newBtn").addEventListener("click", openNew);
    q("cancelBtn").addEventListener("click", closeForm);
    q("formClose").addEventListener("click", closeForm);
    q("formScrim").addEventListener("click", closeForm);
    q("uForm").addEventListener("submit", submit);
    q("pPool").addEventListener("click", function () {
      var cur = currentPick();
      var from = cur && cur.kind === "pool" ? Store.AVATARS.indexOf(cur.file) : -1;
      var used = taken(editingId);
      var pick = null;
      for (var k = from + 1; k < Store.AVATARS.length; k++) {
        if (!used[Store.AVATARS[k]] || (cur && cur.kind === "pool" && Store.AVATARS[k] === cur.file)) { pick = Store.AVATARS[k]; break; }
      }
      if (!pick) { UI.toast("Every image in the pool is already used", "bad"); return; }
      photoPick = { kind: "pool", file: pick };
      renderPhoto();
    });
    q("pClear").addEventListener("click", function () { photoPick = null; f.pFile.value = ""; renderPhoto(); });

    /* the upload itself: click or drag a file onto the box */
    f.pFile.addEventListener("change", function (e) { if (e.target.files && e.target.files[0]) takeFile(e.target.files[0]); });
    ["dragenter", "dragover"].forEach(function (ev) {
      f.pDrop.addEventListener(ev, function (e) { e.preventDefault(); f.pDrop.classList.add("hot"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      f.pDrop.addEventListener(ev, function (e) { e.preventDefault(); f.pDrop.classList.remove("hot"); });
    });
    f.pDrop.addEventListener("drop", function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files[0]) takeFile(files[0]);
    });
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
