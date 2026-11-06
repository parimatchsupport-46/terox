/* ==========================================================================
   Admin.jsx — the admin panel. Three tabs: Dashboard (stats), Users (roster
   details + per-user stats), Payments (pending payment verification requests
   with accept/reject). All data lives in localStorage, no backend.
   ========================================================================== */
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Store from "../lib/store.js";
import useStore from "../lib/useStore.js";
import UI from "../lib/ui.js";
import { db, doc, setDoc, onSnapshot, serverTimestamp } from "../lib/firebase.js";
import { validUpi } from "../lib/upi.js";
import { dashboardCounts } from "../lib/dashboard.js";
import { IcoBack, IcoClose, IcoNavHome, IcoNavChat, IcoNavProfile, IcoMenu } from "../components/icons.jsx";

function AdminChrome({ tab, setTab, children }) {
  useStore();
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [scrim, setScrrim] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const drawer = useRef(null);
  const last = useRef(null);
  const p = Store.profile();

  // Detect desktop — show sidebar instead of slide-in drawer
  useEffect(function () {
    function check() { setDesktop(window.innerWidth >= 1024); }
    check();
    window.addEventListener("resize", check);
    return function () { window.removeEventListener("resize", check); };
  }, []);

  // On desktop, sidebar is always open
  const sidebarOpen = desktop ? true : open;

  function on() {
    last.current = document.activeElement;
    setScrrim(true);
    setOpen(true);
    document.body.classList.add("locked");
  }
  function off() {
    setOpen(false);
    setShow(false);
    window.setTimeout(function () { setScrrim(false); }, 220);
    document.body.classList.remove("locked");
    if (last.current && last.current.focus) last.current.focus({ preventScroll: true });
  }
  function go() { setOpen(false); setShow(false); setScrrim(false); document.body.classList.remove("locked"); }

  useEffect(function () {
    if (!open) return undefined;
    const r = requestAnimationFrame(function () { setShow(true); });
    return function () { cancelAnimationFrame(r); };
  }, [open]);

  useEffect(function () {
    function key(e) { if (e.key === "Escape") off(); }
    document.addEventListener("keydown", key);
    return function () { document.removeEventListener("keydown", key); };
  }, [open]);

  useEffect(function () { return function () { document.body.classList.remove("locked"); }; }, []);

  return (
    <>
      <div className="app admin-app">
        <header className="appbar admin-bar">
          <Link className="icon-btn" to="/" aria-label="Back to user panel"><IcoBack /></Link>
          <b className="admin-title">Terox Admin</b>
          <div className="appbar-actions">
            {!desktop && <button className="icon-btn solid" id="adminMenuBtn" aria-label="Open menu" onClick={open ? off : on}>
              <IcoMenu />
            </button>}
          </div>
        </header>
        <div className="body admin-body">
          <div className="admin-tabs">
            <button className={"admin-tab" + (tab === "dash" ? " active" : "")} onClick={function () { setTab("dash"); }}>Dashboard</button>
            <button className={"admin-tab" + (tab === "users" ? " active" : "")} onClick={function () { setTab("users"); }}>Users</button>
            <button className={"admin-tab" + (tab === "pays" ? " active" : "")} onClick={function () { setTab("pays"); }}>
              Payments
              {Store.pendingPayReqs().length > 0 && <span className="badge-count">{Store.pendingPayReqs().length}</span>}
            </button>
            <button className={"admin-tab" + (tab === "settings" ? " active" : "")} onClick={function () { setTab("settings"); }}>Settings</button>
          </div>
          {children}
        </div>
      </div>

      <button className={"scrim" + (show ? " show" : "")} id="adminScrim" hidden={!scrim} aria-hidden="true" tabIndex={-1} onClick={off} />
      <aside className={"drawer" + (sidebarOpen ? " open" : "")} id="adminDrawer" ref={drawer} aria-label="Menu" aria-hidden={sidebarOpen ? "false" : "true"}>
        <div className="drawer-head">
          <Link className={"avatar s48 t-" + (p.tint || "accent")} to="/profile" data-davatar="">{Store.initials(p.name)}<span className="live"></span></Link>
          <div className="who">
            <b data-dname="">{p.name}</b>
            <span data-dhandle="">@{p.username}</span>
          </div>
          <button className="icon-btn" id="adminDrawerClose" aria-label="Close menu" onClick={off}><IcoClose /></button>
        </div>
        <nav>
          <Link to="/" onClick={go}><IcoNavHome />Home</Link>
          <Link to="/chat" onClick={go}><IcoNavChat />Chat</Link>
          <Link to="/profile" onClick={go}><IcoNavProfile />Profile</Link>
          <Link to="/admin" onClick={go} className="active"><IcoMenu />Admin</Link>
          <button className="drawer-nav-btn" onClick={function () { setTab("settings"); go(); }}><IcoClose />Settings</button>
        </nav>
        <div className="drawer-foot">
          <p className="ver">Terox Admin · v1.0</p>
        </div>
      </aside>
    </>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard() {
  useStore();
  const [resetAt, setResetAt] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(function () {
    return onSnapshot(doc(db, "data", "terox.dashboard.reset.v1"), { includeMetadataChanges: true }, function (snap) {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.metadata.fromCache) { setReady(false); setError("Connect to the internet to load dashboard statistics."); return; }
      const stamp = snap.exists() ? snap.data().resetAt : null;
      setResetAt(stamp && typeof stamp.toMillis === "function" ? stamp.toMillis() : 0);
      setReady(true);
      setError("");
    }, function () { setReady(false); setError("Could not load dashboard statistics."); });
  }, []);
  const counts = dashboardCounts(Store.users(), Store.chats(), Store.payReqs(), resetAt);
  const { total, chatted, noChat, paid, noPay, pending, utrSubmitted } = counts;

  if (!ready) return <p className="settings-desc" role="status">{error || "Loading dashboard…"}</p>;
  const cards = [
    { label: "Contacts in Report", value: total, icon: "👥", color: "accent" },
    { label: "Chatted", value: chatted, icon: "💬", color: "yes" },
    { label: "No Chats", value: noChat, icon: "🤫", color: "warn" },
    { label: "Payments Done", value: paid, icon: "✅", color: "yes" },
    { label: "No Payment", value: noPay, icon: "💳", color: "warn" },
    { label: "UTR Pending", value: pending, icon: "⏳", color: "accent" },
    { label: "UTR Submitted", value: utrSubmitted, icon: "📋", color: "accent" }
  ];

  return (
    <div>
      <p className="dash-period">{resetAt ? "Activity since the last dashboard reset. Only contacts active in this period are counted; all contacts remain in Users." : "All recorded activity. Contacts in Report includes the full roster until the first reset."}</p>
      <div className="dash-grid">
      {cards.map(function (c) {
        return (
          <div className={"dash-card t-" + c.color} key={c.label}>
            <span className="dash-ic">{c.icon}</span>
            <span className="dash-val">{c.value}</span>
            <span className="dash-lbl">{c.label}</span>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ---------------- Users ---------------- */
function Users() {
  const users = Store.users();
  const [filter, setFilter] = useState("");
  const rows = users.map(function (u) {
    return { u: u, s: Store.userStats(u.id) };
  }).filter(function (x) {
    if (!filter) return true;
    var hay = [x.u.name, x.u.username, x.u.role, x.u.bio].join(" ").toLowerCase();
    return hay.indexOf(filter.toLowerCase()) !== -1;
  });

  return (
    <div className="admin-users">
      <div className="admin-search-wrap">
        <input
          className="admin-search"
          type="text"
          placeholder="Search users..."
          value={filter}
          onChange={function (e) { setFilter(e.target.value); }}
        />
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Chats</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(function (x) {
              var st = x.s;
              var payLabel = st.paid ? "✅ Paid" : st.pending ? "⏳ Pending" : "—";
              var statusLabel = st.paid ? "Active" : st.pending ? "Awaiting Verification" : st.chatted ? "Chatting" : "New";
              var statusClass = st.paid ? "yes" : st.pending ? "warn" : st.chatted ? "accent" : "no";
              var lastLabel = st.lastAt ? Store.time(st.lastAt) : "—";
              return (
                <tr key={x.u.id}>
                  <td>
                    <span className="admin-u-name">
                      <span className={"avatar s32 t-" + x.u.tint} dangerouslySetInnerHTML={{ __html: UI.avatarHTML(x.u, 32, false) }} />
                      <span>
                        <b>{x.u.name}</b>
                        <span className="muted">@{x.u.username}</span>
                      </span>
                    </span>
                  </td>
                  <td>{x.u.role || "—"}</td>
                  <td>{st.messages > 0 ? String(st.messages) : "—"}</td>
                  <td>{payLabel}</td>
                  <td><span className={"badge badge-" + statusClass}>{statusLabel}</span></td>
                  <td>{lastLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">Koi user nahi mila</p>}
      </div>
    </div>
  );
}

/* ---------------- Payment Manager ---------------- */
function Payments() {
  const all = Store.payReqs();
  const [filter, setFilter] = useState("pending");
  const [imgOpen, setImgOpen] = useState(null);

  const rows = all.filter(function (r) {
    if (filter === "pending") return r.status === "pending";
    if (filter === "accepted") return r.status === "accepted";
    if (filter === "rejected") return r.status === "rejected";
    return true;
  }).sort(function (a, b) { return b.at - a.at; });

  function accept(id) {
    Store.updatePayReq(id, "accepted");
    UI.toast("Payment accepted ✅", "good");
  }
  function reject(id) {
    Store.updatePayReq(id, "rejected");
    UI.toast("Payment rejected", "bad");
  }

  function fmtDate(at) {
    return new Date(at).toLocaleString([], { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="admin-pays">
      <div className="admin-search-wrap">
        <div className="admin-filter-tabs">
          <button className={"admin-tab sm" + (filter === "pending" ? " active" : "")} onClick={function () { setFilter("pending"); }}>Pending {Store.pendingPayReqs().length}</button>
          <button className={"admin-tab sm" + (filter === "accepted" ? " active" : "")} onClick={function () { setFilter("accepted"); }}>Accepted</button>
          <button className={"admin-tab sm" + (filter === "rejected" ? " active" : "")} onClick={function () { setFilter("rejected"); }}>Rejected</button>
          <button className={"admin-tab sm" + (filter === "all" ? " active" : "")} onClick={function () { setFilter("all"); }}>All</button>
        </div>
      </div>

      <div className="pay-req-list">
        {rows.map(function (r) {
          var u = Store.user(r.uid);
          return (
            <div className={"pay-req t-" + (r.status === "pending" ? "warn" : r.status === "accepted" ? "yes" : "no")} key={r.id}>
              <div className="pay-req-head">
                <span className={"avatar s40 t-" + u.tint} dangerouslySetInnerHTML={{ __html: UI.avatarHTML(u, 40, false) }} />
                <div className="pay-req-info">
                  <b>{u.name}</b>
                  <span className="muted">@{u.username} · {r.service || "—"} · {r.plan || "—"}</span>
                </div>
                <span className={"badge badge-" + (r.status === "pending" ? "warn" : r.status === "accepted" ? "yes" : "no")}>
                  {r.status === "pending" ? "Pending" : r.status === "accepted" ? "Accepted" : "Rejected"}
                </span>
              </div>
              <div className="pay-req-grid">
                <div><span className="muted">UTR</span><b>{r.utr}</b></div>
                <div><span className="muted">Amount</span><b>{r.amount}</b></div>
                {r.upiId && <div><span className="muted">UPI ID</span><b>{r.upiId}</b></div>}
                <div><span className="muted">Mode</span><b>{r.mode || "—"}</b></div>
                <div><span className="muted">Date</span><b>{fmtDate(r.at)}</b></div>
              </div>
              {r.proof && (
                <button className="btn ghost sm proof-btn" onClick={function () { setImgOpen(r); }}>View Payment Proof 📷</button>
              )}
              {r.status === "pending" && (
                <div className="pay-req-actions">
                  <button className="btn sm accept-btn" onClick={function () { accept(r.id); }}>Accept ✅</button>
                  <button className="btn ghost sm danger reject-btn" onClick={function () { reject(r.id); }}>Reject ❌</button>
                </div>
              )}
              {r.status !== "pending" && r.resolvedAt && (
                <p className="pay-req-resolved">
                  {r.status === "accepted" ? "✅ Payment verified — user notified" : "❌ Payment rejected — user notified"} · {fmtDate(r.resolvedAt)}
                </p>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="empty">Koi requests nahi — shaant hai sab</p>}
      </div>

      {imgOpen && (
        <div className="dlg center proof-dlg" role="dialog" aria-modal="true">
          <div className="dlg-box proof-box">
            <div className="dlg-head">
              <b>Payment Proof — {Store.user(imgOpen.uid).name}</b>
              <button className="icon-btn" onClick={function () { setImgOpen(null); }}><IcoClose /></button>
            </div>
            <div className="proof-img-wrap">
              <img src={imgOpen.proof} alt="Payment proof" />
            </div>
            <dl className="pay-rows">
              <div><dt>UTR</dt><dd>{imgOpen.utr}</dd></div>
              <div><dt>Amount</dt><dd>{imgOpen.amount}</dd></div>
              <div><dt>Service</dt><dd>{imgOpen.service || "—"}</dd></div>
              <div><dt>Plan</dt><dd>{imgOpen.plan || "—"}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Settings ---------------- */
function Settings() {
  const [upi, setUpi] = useState("");
  const [remoteUpi, setRemoteUpi] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  useEffect(function () {
    return onSnapshot(doc(db, "data", "terox.upi.v1"), { includeMetadataChanges: true }, function (snap) {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.metadata.fromCache) { setLoading(true); setError("Connect to the internet to load payment settings."); return; }
      setRemoteUpi(snap.exists() && typeof snap.data().value === "string" ? snap.data().value : "");
      setLoading(false);
      setError("");
    }, function (e) { setLoading(true); setError("Unable to load UPI settings: " + e.message); });
  }, []);
  useEffect(function () { if (!editing) setUpi(remoteUpi); }, [remoteUpi, editing]);

  async function publishUpi(value) {
    setSaving(true); setError(""); setSaved(false);
    try {
      await setDoc(doc(db, "data", "terox.upi.v1"), { value: value });
      setRemoteUpi(value); setUpi(value); setEditing(false); setSaved(true);
      UI.toast(value ? "UPI ID saved" : "UPI ID removed", "ok");
    } catch (e) {
      setError("UPI save failed: " + (e.message || "Check Firebase and your connection."));
    } finally { setSaving(false); }
  }
  function saveUpi(e) {
    e.preventDefault();
    const value = upi.trim();
    if (!validUpi(value)) { setError("Enter a valid UPI ID, for example name@bank."); return; }
    publishUpi(value);
  }
  function removeUpi() {
    if (window.confirm("Remove the UPI ID? Users cannot start UPI payments until you set one again.")) publishUpi("");
  }
  async function resetDashboard() {
    if (!window.confirm("Reset dashboard activity counters? Chats, payment requests, users and UPI settings will NOT be deleted.")) return;
    setResetting(true); setResetMessage("");
    try {
      // Use server time so all admin devices share the same reporting period.
      await setDoc(doc(db, "data", "terox.dashboard.reset.v1"), { resetAt: serverTimestamp() });
      setResetMessage("Dashboard activity reset. All report counts start fresh; no users, chats or payments were deleted.");
      UI.toast("Dashboard reset", "ok");
    } catch (e) {
      setResetMessage("Dashboard reset failed: " + (e.message || "Check Firebase and your connection."));
    } finally { setResetting(false); }
  }

  return (
    <div className="settings-page">
      <section className="settings-section card">
        <h3 className="settings-title">Payment UPI ID</h3>
        <p className="settings-desc">Enter the UPI ID that should receive payments. Pay Now opens the user’s UPI app with this ID and the selected amount. Check the recipient in the UPI app before paying.</p>
        <form onSubmit={saveUpi}>
          <div className="settings-field">
            <label htmlFor="upiInput">UPI ID</label>
            <input id="upiInput" type="text" className="settings-input" placeholder="name@bank" value={upi} autoComplete="off" spellCheck={false} disabled={loading || saving}
              onChange={function (e) { setEditing(true); setSaved(false); setError(""); setUpi(e.target.value); }} />
          </div>
          {error && <p role="alert" className="settings-error">{error}</p>}
          {loading && !error && <p role="status" className="settings-desc">Loading UPI settings…</p>}
          {saving && <p role="status" className="settings-desc">Saving to Firestore… Check your connection if this takes too long.</p>}
          <div className="settings-actions">
            <button className="btn yes" type="submit" disabled={loading || saving}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save UPI ID"}</button>
            <button className="btn ghost" type="button" onClick={removeUpi} disabled={loading || saving || !remoteUpi}>Remove UPI ID</button>
          </div>
        </form>
      </section>
      <section className="settings-section card">
        <h3 className="settings-title">Reset dashboard activity</h3>
        <p className="settings-desc">Start all dashboard report counts again from now. New activity will appear here; chats, payment requests, users and UPI settings are not deleted.</p>
        <button className="btn ghost" type="button" onClick={resetDashboard} disabled={resetting}>{resetting ? "Resetting…" : "Clear dashboard data"}</button>
        {resetting && <p className="settings-desc" role="status">Waiting for Firestore… Check your connection if this takes too long.</p>}
        {resetMessage && <p className="settings-result" role="status">{resetMessage}</p>}
      </section>
    </div>
  );
}

/* ---------------- Main ---------------- */
export default function Admin() {
  const [tab, setTab] = useState("dash");
  return (
    <AdminChrome tab={tab} setTab={setTab}>
      {tab === "dash" && <Dashboard />}
      {tab === "users" && <Users />}
      {tab === "pays" && <Payments />}
      {tab === "settings" && <Settings />}
    </AdminChrome>
  );
}
