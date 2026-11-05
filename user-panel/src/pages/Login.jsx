/* ==========================================================================
   Login.jsx — the sign-in / register screen. Two modes, one field each extra:
   name (register) and mobile number (both). Success writes the session, copies
   itself into the app profile and hands over to the screen you came from.
   ========================================================================== */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Auth from "../lib/auth.js";
import UI from "../lib/ui.js";
import logo from "../assets/logo.png";

const HINTS = {
  in: "10 digits, starting with 6, 7, 8 or 9. There is no password — this number is the account on this device.",
  up: "Your name is what the other side sees. The number signs you back in on this device."
};
const APP_ROUTES = /^(\/(index|chat|profile|user))?(\?|$)/;

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState("in");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [err, setErr] = useState("");
  const [offer, setOffer] = useState(false);
  const [busy, setBusy] = useState(false);
  const nameEl = useRef(null);
  const telEl = useRef(null);

  const signingIn = mode === "in";
  const accounts = Auth.accounts().slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, 6);

  function target() {
    let next = "";
    try { next = new URLSearchParams(loc.search).get("next") || ""; } catch (e) {}
    return APP_ROUTES.test(next) ? next : "/";
  }

  useEffect(function () {
    document.body.classList.add("gate-page");
    document.body.setAttribute("data-gate", "off");
    document.title = "Sign in · Terox Chat";
    return function () {
      document.body.classList.remove("gate-page");
      document.body.removeAttribute("data-gate");
    };
  }, []);

  function pick(a) {
    setMobile(a.mobile);
    setMode("in");
    setErr("");
  }

  function submit(e) {
    e.preventDefault();
    const r = mode === "up" ? Auth.register(name, mobile) : Auth.signIn(mobile);
    if (r.error) {
      setErr(r.error);
      setOffer(!!r.id);
      return;
    }
    setOffer(false);
    Auth.trust(r.account);
    UI.toast(mode === "up" ? "Account created — welcome, " + r.account.name.split(" ")[0] : "Signed in as " + r.account.name, "ok");
    setBusy(true);
    window.setTimeout(function () { nav(target(), { replace: true }); }, 260);
  }

  return (
    <>
      <header className="appbar">
        <div className="brand">
          <img className="logo-img" src={logo} alt="" width="30" height="30" />
          <span className="titles"><b>Terox Chat</b><span>Sign in to continue</span></span>
        </div>
        <div className="appbar-actions">
        </div>
      </header>

      <main className="gate">
        <section className="gate-hero">
          <img className="logo-img" src={logo} alt="Terox Chat" width="56" height="56" />
          <h1>Welcome to Terox</h1>
          <p>Sign in with your mobile number. First time here? Create an account with your name and number — it stays on this device.</p>
        </section>

        <div className="gate-seg" role="group" aria-label="Sign in or create an account">
          <button className={"btn sm" + (signingIn ? "" : " ghost")} type="button" id="modeIn" aria-pressed={String(signingIn)} onClick={function () { setMode("in"); setErr(""); }}>Sign in</button>
          <button className={"btn sm" + (signingIn ? " ghost" : "")} type="button" id="modeUp" aria-pressed={String(!signingIn)} onClick={function () { setMode("up"); setErr(""); }}>Create account</button>
        </div>

        <form className="card gate-card" id="gateForm" autoComplete="off" noValidate onSubmit={submit}>
          <div className="field" id="nameField" hidden={signingIn}>
            <label htmlFor="gName">Your name</label>
            <input className="input" id="gName" ref={nameEl} maxLength="40" placeholder="Ananya Rao" autoComplete="name" value={name} onChange={function (e) { setName(e.target.value); }} />
            <p className="hint">Shown on your profile and in the chat list</p>
          </div>

          <div className="field">
            <label htmlFor="gMobile">Mobile number</label>
            <div className="gate-tel">
              <span className="cc" aria-hidden="true">+91</span>
              <input className="input" id="gMobile" ref={telEl} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="9876543210" spellCheck="false" aria-invalid={err ? "true" : undefined} value={mobile}
                onChange={function (e) {
                  const d = Auth.digits(e.target.value).slice(0, 10);
                  setMobile(d);
                  if (err) setErr("");
                }} />
            </div>
            <p className="err" id="gErr" hidden={!err}>{err}</p>
            <p className="hint" id="gHint">{HINTS[mode]}</p>
          </div>

          <button className="btn yes block" type="submit" id="gGo" disabled={busy}>{signingIn ? "Sign in" : "Create account and continue"}</button>
          {offer && <button className="linklike" type="button" onClick={function () { setMode("in"); setErr(""); setOffer(false); }}>Sign in with that number instead</button>}
        </form>

        <section className="gate-saved" id="savedWrap" hidden={accounts.length === 0}>
          <h2>On this device</h2>
          <div className="gate-saved-row" id="savedRow">
            {accounts.map(function (a) {
              return (
                <button className="gate-saved-btn" type="button" key={a.id} onClick={function () { pick(a); }}>
                  <span dangerouslySetInnerHTML={{ __html: UI.avatarHTML({ name: a.name, tint: "accent" }, 36, false) }} />
                  <span><b>{a.name}</b><span className="num">{Auth.pretty(a.mobile)}</span></span>
                </button>
              );
            })}
          </div>
          <p className="hint">Tap a number to fill it in — the account you used last is signed in by itself.</p>
        </section>

        <p className="gate-foot">No server, no database: the account and the signed-in session live in this browser, so opening Terox again skips this screen.</p>
      </main>
    </>
  );
}
