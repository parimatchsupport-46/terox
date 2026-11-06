/* ==========================================================================
   auth.js — the account gate for the user panel.

   Sign in with a mobile number, register with a name and a mobile number.
   There is no server: the accounts created on this device and the session that
   keeps you signed in are plain localStorage entries, which is also why the app
   opens straight to the list after the first sign-in.
   ========================================================================== */
import Store from "./store.js";

const Auth = (function () {
  "use strict";

  var ACC = "terox.accounts.v1";
  var SES = "terox.session.v1";

  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: stay on this page */ } }
  function ping() { try { document.dispatchEvent(new CustomEvent("terox:accounts")); } catch (e) {} }

  function digits(s) { return String(s === undefined || s === null ? "" : s).replace(/\D/g, ""); }
  /* people paste "+91 98765-43210" or dial "098765 43210": both mean the same number */
  function norm(s) {
    var d = digits(s);
    if (d.length === 12 && d.slice(0, 2) === "91") d = d.slice(2);
    else if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
    return d;
  }
  function valid(m) { return /^[6-9]\d{9}$/.test(norm(m)); }        /* 10-digit Indian mobile */
  function pretty(m) { var d = norm(m); return d.length === 10 ? "+91 " + d.slice(0, 5) + " " + d.slice(5) : d; }

  function accounts() { return read(ACC, []); }
  function find(mobile) {
    var m = norm(mobile);
    var all = accounts();
    for (var i = 0; i < all.length; i++) if (all[i].mobile === m) return all[i];
    return null;
  }

  /* both return { account } on success or { error, id? } — the form decides what to show */
  function register(name, mobile) {
    var n = String(name || "").trim().replace(/\s+/g, " ");
    var m = norm(mobile);
    if (n.length < 2) return { error: "Type your name — at least 2 characters." };
    if (n.length > 40) n = n.slice(0, 40);
    if (!valid(m)) return { error: "Enter a 10-digit mobile number starting with 6, 7, 8 or 9." };
    var hit = find(m);
    if (hit) return { error: "That number already has an account. Sign in with it.", id: hit.id };
    var a = {
      id: "u" + m,
      name: n,
      mobile: m,
      handle: n.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "member",
      at: Date.now()
    };
    write(ACC, accounts().concat([a]));
    ping();
    return { account: a };
  }

  function signIn(mobile) {
    var m = norm(mobile);
    if (!valid(m)) return { error: "Enter a 10-digit mobile number starting with 6, 7, 8 or 9." };
    var a = find(m);
    if (!a) return { error: accounts().length ? "No account uses that number on this device." : "No accounts here yet — create one below." };
    return { account: a };
  }

  /* the chat app reads "me" from Store.profile(), so the account IS the profile */
  function applyProfile(a) {
    if (!a || !Store || !Store.saveProfile) return;
    Store.saveProfile({ name: a.name, username: a.handle, phone: pretty(a.mobile) });
  }

  function trust(a) { write(SES, a.id); applyProfile(a); return a; }
  function forget() { write(SES, null); }

  /* the gate only needs to know whether a session id resolves to an account:
     adopting the profile stays with current(), which is what the old page
     scripts called after the store was already in */
  function peek() {
    var id = read(SES, null);
    if (!id) return false;
    var all = accounts();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return true;
    return false;
  }

  function current() {
    var id = read(SES, null);
    if (!id) return null;
    var all = accounts(), i;
    for (i = 0; i < all.length; i++) if (all[i].id === id) { applyProfile(all[i]); return all[i]; }
    forget();
    return null;
  }

  function signOut() { forget(); ping(); }

  return {
    keys: { accounts: ACC, session: SES },
    digits: digits, norm: norm, valid: valid, pretty: pretty,
    accounts: accounts, find: find, register: register, signIn: signIn,
    current: current, peek: peek, trust: trust, signOut: signOut, forget: forget,
    applyProfile: applyProfile
  };
})();

export default Auth;
