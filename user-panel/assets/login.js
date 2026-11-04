/* ==========================================================================
   login.js — the sign-in / register screen. Two modes, one field each extra:
   name (register) and mobile number (both). Success writes the session and
   hands the app the profile; there is nothing else to call.
   ========================================================================== */
(function () {
  "use strict";

  var A = window.Auth;
  if (!A) return;

  function q(id) { return document.getElementById(id); }
  var f = {
    form: q("gateForm"), name: q("gName"), mobile: q("gMobile"),
    err: q("gErr"), hint: q("gHint"), go: q("gGo"),
    nameField: q("nameField"), in: q("modeIn"), up: q("modeUp"),
    saved: q("savedWrap"), row: q("savedRow")
  };
  var mode = "in";

  /* already signed in? this screen has nothing to do */
  if (A.current()) { location.replace(target()); return; }

  function target() {
    var next = "";
    try { next = new URLSearchParams(location.search).get("next") || ""; } catch (e) {}
    return /^(index|chat|profile|user)\.html(\?[^]*)?$/.test(next) ? next : "index.html";
  }

  function setMode(m) {
    mode = m;
    var signingIn = m === "in";
    f.in.classList.toggle("ghost", !signingIn);
    f.up.classList.toggle("ghost", signingIn);
    f.in.setAttribute("aria-pressed", String(signingIn));
    f.up.setAttribute("aria-pressed", String(!signingIn));
    f.nameField.hidden = signingIn;
    f.go.textContent = signingIn ? "Sign in" : "Create account and continue";
    f.hint.textContent = signingIn
      ? "10 digits, starting with 6, 7, 8 or 9. There is no password — this number is the account on this device."
      : "Your name is what the other side sees. The number signs you back in on this device.";
    q("gateForm").elements[signingIn ? "gMobile" : "gName"].focus();
    show();
  }

  function show(msg) {
    f.err.textContent = msg || "";
    f.err.hidden = !msg;
    f.mobile.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function renderSaved() {
    var all = A.accounts();
    f.saved.hidden = all.length === 0;
    f.row.innerHTML = "";
    all.sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, 6).forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "gate-saved-btn";
      var av = document.createElement("span");
      av.innerHTML = window.UI && UI.avatarHTML ? UI.avatarHTML({ name: a.name, tint: "accent" }, 36, false) : "";
      var lab = document.createElement("span");
      var n = document.createElement("b"); n.textContent = a.name;
      var m = document.createElement("span"); m.className = "num"; m.textContent = A.pretty(a.mobile);
      lab.appendChild(n); lab.appendChild(m);
      b.appendChild(av); b.appendChild(lab);
      b.addEventListener("click", function () {
        f.mobile.value = a.mobile;
        setMode("in");
        show("");
      });
      f.row.appendChild(b);
    });
  }

  f.in.addEventListener("click", function () { setMode("in"); });
  f.up.addEventListener("click", function () { setMode("up"); });
  f.mobile.addEventListener("input", function () {
    var d = A.digits(f.mobile.value).slice(0, 10);
    if (d !== f.mobile.value) f.mobile.value = d;
    if (!f.err.hidden) show("");
  });
  document.addEventListener("terox:accounts", renderSaved);

  f.form.addEventListener("submit", function (e) {
    e.preventDefault();
    var r = mode === "up" ? A.register(f.name.value, f.mobile.value) : A.signIn(f.mobile.value);
    if (r.error) {
      show(r.error);
      /* the number is taken but it IS an account: offer the other mode */
      if (r.id) {
        f.go.insertAdjacentHTML("afterend", "");
        var jump = document.createElement("button");
        jump.type = "button";
        jump.className = "linklike";
        jump.textContent = "Sign in with that number instead";
        jump.addEventListener("click", function () { setMode("in"); show(""); jump.remove(); });
        f.form.appendChild(jump);
      }
      (mode === "up" && r.error.indexOf("name") > -1 ? f.name : f.mobile).focus();
      return;
    }
    var jump = f.form.querySelector(".linklike");
    if (jump) jump.remove();
    A.trust(r.account);
    UI.toast(mode === "up" ? "Account created — welcome, " + r.account.name.split(" ")[0] : "Signed in as " + r.account.name, "ok");
    f.go.disabled = true;
    setTimeout(function () { location.replace(target()); }, 260);
  });

  renderSaved();
})();
