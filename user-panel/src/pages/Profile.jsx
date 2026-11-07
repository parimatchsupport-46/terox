/* ==========================================================================
   Profile.jsx — identity (name / username / phone / status), avatar tint, chat
   preferences and the local-data controls. Same markup, same ids, same
   read-only-until-Edit behaviour; the values simply come from Store now.
   ========================================================================== */
import { useRef, useState } from "react";
import Store from "../lib/store.js";
import UI from "../lib/ui.js";
import useStore from "../lib/useStore.js";
import Chrome from "../components/Chrome.jsx";

const FIELDS = ["name", "username", "phone", "bio"];
const TINTS = [
  { id: "accent", label: "Deep blue" },
  { id: "yes", label: "Dodger blue" },
  { id: "no", label: "Sky blue" },
  { id: "warn", label: "Periwinkle" }
];
const PREFS = [
  { id: "notifications", t: "Notifications", d: "Alert me when a new message arrives" },
  { id: "sounds", t: "Message sounds", d: "Short chime on send and receive" }
];

export default function Profile() {
  const bump = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(function () { return Store.profile(); });
  const refs = { name: useRef(null), username: useRef(null), phone: useRef(null), bio: useRef(null) };

  const tint = TINTS.some(function (x) { return x.id === saved.tint; }) ? saved.tint : "accent";
  const prefs = Store.prefs();
  const view = editing ? draft : saved;
  const shown = {
    name: (editing ? String(draft.name || "").trim() : saved.name) || "\u2014",
    username: (editing ? String(draft.username || "").trim() : saved.username) ? "@" + String(editing ? draft.username : saved.username).trim() : "\u2014",
    phone: (editing ? String(draft.phone || "").trim() : saved.phone) || "No phone added"
  };

  document.title = "Profile · Terox Chat";

  function start() {
    const d = {};
    FIELDS.forEach(function (f) { d[f] = saved[f] == null ? "" : saved[f]; });
    setDraft(d);
    setEditing(true);
  }
  function stop() { setEditing(false); }

  function save(e) {
    e.preventDefault();
    const patch = {};
    FIELDS.forEach(function (f) {
      patch[f] = String(draft[f] == null ? "" : draft[f]).replace(/\s+/g, " ").trim();
    });
    if (!patch.name) { UI.toast("Name is required", "bad"); refs.name.current.focus(); return; }
    if (!patch.bio) { UI.toast("Status cannot be empty", "bad"); refs.bio.current.focus(); return; }
    if (patch.phone && !/^[+0-9 ()-]{7,20}$/.test(patch.phone)) { UI.toast("Phone number looks off", "bad"); refs.phone.current.focus(); return; }
    patch.username = String(patch.username).toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!patch.username) { UI.toast("Username needs letters or numbers", "bad"); refs.username.current.focus(); return; }

    setSaved(Store.saveProfile(patch));
    stop();
    UI.toast("Profile saved", "ok");
  }

  function resetProfile() {
    const prev = Store.profile();
    try { localStorage.removeItem("terox.profile.v1"); } catch (e) {}
    setSaved(Store.profile());
    bump();
    UI.toast("Profile reset", "info", {
      label: "Undo",
      onClick: function () { setSaved(Store.saveProfile(prev)); bump(); }
    });
  }

  function clearChats() {
    let snapshot = null;
    try { snapshot = localStorage.getItem("terox.chats.v1"); } catch (e) {}
    Store.clearAll();
    UI.toast("All chats deleted", "bad", {
      label: "Undo",
      onClick: function () {
        if (!snapshot) return;
        try { localStorage.setItem("terox.chats.v1", snapshot); } catch (e) {}
        bump();
        UI.toast("Chats restored", "ok");
      }
    });
  }

  const threads = Object.keys(Store.chats());
  const msgs = threads.reduce(function (n, id) { return n + Store.chats()[id].messages.length; }, 0);
  const unread = Store.unreadTotal();

  return (
    <Chrome bar={<div className="titles"><b>Profile</b></div>}>
      <div className="screen stack" style={{ "--gap": "14px" }}>

        <section className="card phero">
          <span className={"avatar s72 t-" + tint} id="pAvatar">{Store.initials(shown.name)}<span className="live"></span></span>
          <h1 id="pName">{shown.name}</h1>
          <div className="pid">
            <div><span>Username</span><b id="pUser">{shown.username}</b></div>
            <div><span>Mobile</span><b id="pPhone" className="mono">{shown.phone}</b></div>
            <div><span>Presence</span><b className="on"><span className="dot-status online"></span>Online</b></div>
          </div>
          <div className="tints" id="tints" role="group" aria-label="Avatar colour (blue theme)">
            {TINTS.map(function (x) {
              return <button key={x.id} type="button" data-tint={x.id} aria-label={x.label} aria-pressed={String(x.id === tint)} onClick={function () { setSaved(Store.saveProfile({ tint: x.id })); }} />;
            })}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>About</h2>
              <p id="aboutHint">{editing ? "Save to apply across the app" : "Shown to everyone in your chat list"}</p>
            </div>
            <button className="btn ghost sm" type="button" id="editBtn" onClick={editing ? function () { setEditing(false); } : start}>{editing ? "Cancel" : "Edit"}</button>
          </div>

          <form id="profileForm" autoComplete="off" onSubmit={save}>
            <div className="stack" style={{ "--gap": "12px" }}>
              <div className={"field" + (editing ? "" : " view")} data-field="name">
                <label htmlFor="fName">Name</label>
                <input className="input" id="fName" ref={refs.name} disabled={!editing} value={editing ? draft.name : saved.name || ""} onChange={function (e) { setDraft({ ...draft, name: e.target.value }); }} />
              </div>
              <div className={"field" + (editing ? "" : " view")} data-field="username">
                <label htmlFor="fUsername">Username</label>
                <input className="input" id="fUsername" ref={refs.username} disabled={!editing} autoCapitalize="none" value={editing ? draft.username : saved.username || ""} onChange={function (e) { setDraft({ ...draft, username: e.target.value }); }} />
              </div>
              <div className={"field" + (editing ? "" : " view")} data-field="phone">
                <label htmlFor="fPhone">Phone</label>
                <input className="input" id="fPhone" ref={refs.phone} type="tel" inputMode="tel" disabled={!editing} value={editing ? draft.phone : saved.phone || ""} onChange={function (e) { setDraft({ ...draft, phone: e.target.value }); }} />
              </div>
              <div className={"field" + (editing ? "" : " view")} data-field="bio">
                <label htmlFor="fBio">Status</label>
                <textarea className="textarea" id="fBio" ref={refs.bio} rows="2" maxLength="120" disabled={!editing} value={editing ? draft.bio : saved.bio || ""} onChange={function (e) { setDraft({ ...draft, bio: e.target.value }); }} />
              </div>
            </div>

            <div className="pfoot" id="formActions" hidden={!editing}>
              <button className="btn ghost" type="button" id="cancelBtn" onClick={stop}>Cancel</button>
              <button className="btn yes" type="submit">Save</button>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card-head">
            <div><h2>Chat settings</h2></div>
          </div>
          {PREFS.map(function (x) {
            return (
              <div className="toggle-item" key={x.id}>
                <div>
                  <div className="tl">{x.t}</div>
                  <div className="td">{x.d}</div>
                </div>
                <label className="switch">
                  <input type="checkbox" data-pref={x.id} checked={!!prefs[x.id]} onChange={function (e) {
                    Store.savePref(x.id, e.target.checked);
                    UI.toast(x.t + (e.target.checked ? " on" : " off"), e.target.checked ? "ok" : "info");
                  }} />
                  <span className="sl"></span>
                </label>
              </div>
            );
          })}
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Chats on this device</h2>
              <p id="chatStat">{threads.length + " chats \u00b7 " + msgs + " messages" + (unread ? " \u00b7 " + unread + " unread" : " \u00b7 all read")}</p>
            </div>
          </div>
          <div className="pfoot">
            <button className="btn ghost" type="button" id="resetProfile" onClick={resetProfile}>Reset profile</button>
            <button className="btn no" type="button" id="clearChats" onClick={clearChats}>Delete all chats</button>
          </div>
        </section>

      </div>
    </Chrome>
  );
}
