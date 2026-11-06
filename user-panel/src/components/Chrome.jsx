/* ==========================================================================
   Chrome.jsx — the frame every screen had in the HTML version: .app > header
   .appbar + .body, then the scrim and the drawer that slides in from the LEFT
   while its button sits on the right. Same ids, same classes, same focus and
   scroll-lock behaviour, now driven by one piece of state.
   ========================================================================== */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Store from "../lib/store.js";
import UI from "../lib/ui.js";
import useStore from "../lib/useStore.js";
import logo from "../assets/logo.png";
import { IcoMenu, IcoClose, IcoNavHome, IcoNavChat, IcoNavProfile } from "./icons.jsx";

export function Brand() {
  return (
    <span className="brand">
      <img className="logo-img" src={logo} alt="Terox Chat logo" width="30" height="30" />
      Terox Chat
    </span>
  );
}

export function UnreadPill({ className }) {
  const n = Store.unreadTotal();
  return (
    <span className={className} data-unread-pill="" hidden={n === 0}>
      {n > 0 ? (n > 99 ? "99+" : String(n)) : "0"}
    </span>
  );
}

export default function Chrome({ full, bar, bodyStyle, overlays, children }) {
  useStore();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [scrim, setScrim] = useState(false);
  const drawer = useRef(null);
  const last = useRef(null);

  const p = Store.profile();
  const here = loc.pathname === "/chat" ? "chat" : loc.pathname === "/profile" ? "profile" : "home";

  function on() {
    last.current = document.activeElement;
    setScrim(true);
    setOpen(true);
    document.body.classList.add("locked");
  }
  function off() {
    setOpen(false);
    setShow(false);
    window.setTimeout(function () { setScrim(false); }, 220);
    document.body.classList.remove("locked");
    if (last.current && last.current.focus) last.current.focus({ preventScroll: true });
  }
  function go() { setOpen(false); setShow(false); setScrim(false); document.body.classList.remove("locked"); }

  useEffect(function () {
    if (!open) return undefined;
    const r = requestAnimationFrame(function () { setShow(true); });
    const t = window.setTimeout(function () {
      const a = drawer.current && drawer.current.querySelector("nav a");
      if (a && a.focus) a.focus({ preventScroll: true });
    }, 0);
    return function () { cancelAnimationFrame(r); window.clearTimeout(t); };
  }, [open]);

  useEffect(function () {
    function key(e) { if (e.key === "Escape") off(); }
    document.addEventListener("keydown", key);
    return function () { document.removeEventListener("keydown", key); };
  }, [open]);

  useEffect(function () { return function () { document.body.classList.remove("locked"); }; }, []);

  return (
    <>
      <div className={"app" + (full ? " full" : "")}>
        <header className="appbar">
          {bar}
          <div className="appbar-actions">
            <button className="icon-btn solid" id="menuBtn" aria-label="Open menu" aria-expanded={open ? "true" : "false"} aria-controls="drawer" onClick={open ? off : on}>
              <IcoMenu />
              <UnreadPill className="pill" />
            </button>
          </div>
        </header>

        <div className="body" style={bodyStyle}>{children}</div>
      </div>

      {overlays}

      <button className={"scrim" + (show ? " show" : "")} id="scrim" hidden={!scrim} aria-hidden="true" tabIndex={-1} onClick={off} />
      <aside className={"drawer" + (open ? " open" : "")} id="drawer" ref={drawer} aria-label="Menu" aria-hidden={open ? "false" : "true"}>
        <div className="drawer-head">
          <Link className={"avatar s48 t-" + (p.tint || "accent")} to="/profile" data-davatar="">{Store.initials(p.name)}<span className="live"></span></Link>
          <div className="who">
            <b data-dname="">{p.name}</b>
            <span data-dhandle="">@{p.username}</span>
          </div>
          <button className="icon-btn" id="drawerClose" aria-label="Close menu" onClick={off}>
            <IcoClose />
          </button>
        </div>
        <nav>
          <Link to="/" data-nav="home" className={here === "home" ? "active" : undefined} aria-current={here === "home" ? "page" : undefined} onClick={go}>
            <IcoNavHome />
            Home
          </Link>
          <Link to="/chat" data-nav="chat" className={here === "chat" ? "active" : undefined} aria-current={here === "chat" ? "page" : undefined} onClick={go}>
            <IcoNavChat />
            Chat
            <UnreadPill className="badge-count" />
          </Link>
          <Link to="/profile" data-nav="profile" className={here === "profile" ? "active" : undefined} aria-current={here === "profile" ? "page" : undefined} onClick={go}>
            <IcoNavProfile />
            Profile
          </Link>
        </nav>
        <div className="drawer-foot">
          <div className="rowline">
            <span className="tl">Appearance</span>
            <button className="btn ghost sm" type="button" onClick={UI.toggleTheme} aria-label="Switch light or dark mode">
              {document.documentElement.getAttribute("data-theme") === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
            </button>
          </div>
          <p className="ver"><img className="ver-logo" src={logo} alt="" width="16" height="16" /> Terox Chat · v1.0 · mobile only</p>
        </div>
      </aside>
    </>
  );
}
