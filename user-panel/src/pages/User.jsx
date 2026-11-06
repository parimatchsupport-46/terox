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
            <div><span>Role</span><b id="uRole">{found ? (u.role || "no role set") : "\u2014"}</b></div>
            <div><span>Presence</span><b className="on"><span className="dot-status online"></span>Online</b></div>
          </div>
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
