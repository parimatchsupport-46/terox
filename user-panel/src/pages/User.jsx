/* ==========================================================================
   User.jsx — read-only view of anybody's profile (#/user?u=<id>). The roster is
   owned by the admin panel, so this screen never edits anything.
   ========================================================================== */
import { Link, useLocation } from "react-router-dom";
import Store from "../lib/store.js";
import UI from "../lib/ui.js";
import useStore from "../lib/useStore.js";
import Chrome from "../components/Chrome.jsx";
import { IcoBack } from "../components/icons.jsx";

export default function User() {
  useStore();
  const loc = useLocation();
  const wanted = new URLSearchParams(loc.search).get("u");
  let found = null;
  Store.users().forEach(function (u) { if (u.id === wanted) found = u; });

  const u = found || { name: "?", tint: "accent" };
  const t = Store.thread(u.id);
  const last = t.messages.length ? t.messages[t.messages.length - 1] : null;
  const handle = "@" + (u.username || Store.slug(u.name || ""));

  document.title = (found ? u.name + " · Terox Chat" : "No such user · Terox Chat");

  return (
    <Chrome
      bar={<>
        <Link className="icon-btn" to="/" aria-label="Back to all users"><IcoBack /></Link>
        <div className="titles"><b id="barName">{found ? u.name.split(" ")[0] + "\'s profile" : "Profile"}</b></div>
      </>}
    >
      <div className="screen stack" style={{ "--gap": "14px" }}>
        <section className="card phero">
          <span id="uAvatar" dangerouslySetInnerHTML={{ __html: UI.avatarHTML(u, found ? 96 : 96, !!found) }} />
          <h1 id="uName">{found ? u.name : "User not found"}</h1>
          <div className="pid">
            <div><span>Username</span><b id="uUser">{found ? handle : "\u2014"}</b></div>
            <div><span>Role</span><b id="uRole">{found ? (u.role || "no role set") : "\u2014"}</b></div>
            <div><span>Presence</span><b className="on"><span className="dot-status online"></span>Online</b></div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><div><h2>About</h2><p>Shared by this user</p></div></div>
          <p className="bio" id="uBio">{found ? (u.bio || "No bio yet — the admin has not filled this in.") : "Is id ka koi user roster me nahi hai. Admin panel se user banaiye ya list se choose kijiye."}</p>
          <dl className="kv">
            <div><dt>Username</dt><dd id="uHandle">{found ? handle : "@\u2014"}</dd></div>
            <div><dt>Photo</dt><dd id="uPhoto">{found ? (u.photo ? u.photo + " · from the avatar pool" : "no image, initials only") : "\u2014"}</dd></div>
            <div><dt>Chat activity</dt><dd id="uStat">{found
              ? (t.messages.length ? t.messages.length + (t.messages.length === 1 ? " message" : " messages") + " · last at " + Store.time(last.at) + ", " + Store.dayStamp(last.at) : "no messages yet")
              : "\u2014"}</dd></div>
          </dl>
        </section>

        <div className="pfoot">
          {found
            ? <Link className="btn yes" id="uChat" to={"/chat?u=" + encodeURIComponent(u.id)}>Message</Link>
            : <Link className="btn ghost" id="uChat" to="/">Back to users</Link>}
          <Link className="btn ghost" to="/">Back to users</Link>
        </div>
      </div>
    </Chrome>
  );
}
