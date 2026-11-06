/* ==========================================================================
   Chrome.jsx — admin panel chrome: .app > header .appbar + .body, drawer.
   Same look as the user panel, simplified nav (only admin).
   ========================================================================== */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../lib/store.js";
import useStore from "../lib/useStore.js";
import logo from "../assets/logo.png";
import { IcoMenu, IcoClose, IcoNavHome, IcoNavChat, IcoNavProfile } from "./icons.jsx";

export default function Chrome({ bar, bodyStyle, children }) {
  useStore();
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [scrim, setScrrim] = useState(false);
  const drawer = useRef(null);
  const last = useRef(null);

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
          {bar}
          <div className="appbar-actions">
            <button className="icon-btn solid" id="adminMenuBtn" aria-label="Open menu" onClick={open ? off : on}>
              <IcoMenu />
            </button>
          </div>
        </header>
        <div className="body admin-body" style={bodyStyle}>{children}</div>
      </div>

      <button className={"scrim" + (show ? " show" : "")} id="adminScrim" hidden={!scrim} aria-hidden="true" tabIndex={-1} onClick={off} />
      <aside className={"drawer" + (open ? " open" : "")} id="adminDrawer" ref={drawer} aria-label="Menu" aria-hidden={open ? "false" : "true"}>
        <div className="drawer-head">
          <Link className="avatar s48 t-accent" to="/" data-davatar="">{Store.initials(Store.profile().name)}<span className="live"></span></Link>
          <div className="who">
            <b data-dname="">{Store.profile().name}</b>
            <span data-dhandle="">@{Store.profile().username}</span>
          </div>
          <button className="icon-btn" id="adminDrawerClose" aria-label="Close menu" onClick={off}><IcoClose /></button>
        </div>
        <nav>
          <Link to="/" onClick={go}><IcoNavHome />User Panel</Link>
          <Link to="/admin" onClick={go} className="active"><IcoMenu />Admin Panel</Link>
        </nav>
        <div className="drawer-foot">
          <p className="ver"><img className="ver-logo" src={logo} alt="" width="16" height="16" /> Terox Admin · v1.0</p>
        </div>
      </aside>
    </>
  );
}
