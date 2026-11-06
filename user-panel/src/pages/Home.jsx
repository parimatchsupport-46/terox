/* ==========================================================================
   Home.jsx — the user list. Roster comes from the admin panel (Store.users),
   every contact is online, newest activity first. The face opens that profile,
   the rest of the row opens the chat.
   Rows show the avatar, name, online status and unread badge;
   time and preview message are omitted. A typing bar shows when the bot is
   replying to any thread, even from here.
   ========================================================================== */
import { useState } from "react";
import { Link } from "react-router-dom";
import Store from "../lib/store.js";
import UI from "../lib/ui.js";
import useStore from "../lib/useStore.js";
import Chrome, { Brand } from "../components/Chrome.jsx";
import { IcoSearch, IcoClose } from "../components/icons.jsx";

function Row({ u, unread }) {
  return (
    <div className={"urow" + (unread ? " unread" : "")} data-uid={u.id} role="listitem">
      <Link className="face" to={"/user?u=" + encodeURIComponent(u.id)} aria-label={"View profile: " + u.name} dangerouslySetInnerHTML={{ __html: UI.avatarHTML(u, 48, true) }} />
      <Link className="main" to={"/chat?u=" + encodeURIComponent(u.id)}>
        <span className="n"><b>{u.name}</b></span>
        <span className="p">
          <span className="st"><span className="dot-status online"></span>Online</span>
          {unread ? <span className="badge-count">{unread}</span> : null}
        </span>
      </Link>
    </div>
  );
}

export default function Home() {
  useStore();
  const [raw, setRaw] = useState("");
  const filter = raw.trim();
  const typing = Store.typingOn();

  const all = Store.chats();
  const roster = Store.users();
  const rows = roster
    .slice()
    .sort(function (a, b) { return Store.lastAt(all, b.id) - Store.lastAt(all, a.id); })
    .filter(function (u) {
      if (!filter) return true;
      const t = Store.last(all, u.id);
      return [u.name, u.username, u.role, u.bio, t ? t.text : ""].join(" ").toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    });

  document.title = "Terox Chat";

  return (
    <Chrome bar={<Brand />}>
      <div className="listbar">
        <div className="hint">
          <h1>All users</h1>
          <span><b data-online="">{roster.length}</b> online</span>
        </div>
        <div className="search">
          <IcoSearch />
          <input
            type="search" id="userSearch" placeholder="Search name or message" aria-label="Search users"
            autoComplete="off" enterKeyHint="search" value={raw}
            onChange={function (e) { setRaw(e.target.value); }}
            onKeyDown={function (e) { if (e.key === "Escape") setRaw(""); }}
          />
          <button className="s-clear" id="searchClear" aria-label="Clear search" hidden={!filter} onClick={function () { setRaw(""); const i = document.getElementById("userSearch"); if (i) i.focus(); }}>
            <IcoClose sw={2.4} />
          </button>
        </div>
      </div>

      <div className="ulist" id="userList" role="list" data-ids={roster.map(function (u) { return u.id; }).join(",")}>
        {rows.length === 0
          ? (roster.length
            ? <p className="empty">Koi user nahi mila — "{filter}"</p>
            : <p className="empty">Abhi koi user nahi. Admin panel se user banaiye — <a href="../../admin-panel/index.html">open admin</a>.</p>)
          : rows.map(function (u) {
            return <Row key={u.id} u={u} unread={(all[u.id] && all[u.id].unread) || 0} />;
          })}
      </div>

      <div className="typingbar" id="typingBar" hidden={!typing}>
        <span className="spinner-dots" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span></span>
        <span id="typingWho">{Store.typingName() + " is typing…"}</span>
      </div>
    </Chrome>
  );
}
