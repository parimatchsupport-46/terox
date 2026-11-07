/* UTR page shown when a user returns from their UPI app. */
import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Chrome from "../components/Chrome.jsx";
import Store from "../lib/store.js";
import { visitorId } from "../lib/visitor.js";
import { beginVerification } from "../lib/verificationSession.js";
import useStore from "../lib/useStore.js";
import UI from "../lib/ui.js";
import { IcoBack } from "../components/icons.jsx";
import { upiPaymentUri } from "../lib/upi.js";
import useUpiRecipient from "../lib/useUpiRecipient.js";
import { readPaymentSession, validPaymentSession, clearPaymentSession } from "../lib/paymentSession.js";

export default function Payment() {
  useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const uid = params.get("uid") || "";
  const user = Store.user(uid);
  const recipient = useUpiRecipient();
  const [session] = useState(function () {
    const fromNavigation = location.state && location.state.payment;
    return validPaymentSession(fromNavigation, uid) ? fromNavigation : readPaymentSession(uid);
  });
  const [payUtr, setPayUtr] = useState("");
  const [done, setDone] = useState(false);
  const [paySecs, setPaySecs] = useState(function () {
    return session ? Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000)) : 0;
  });

  function mmss(s) {
    const m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
  }
  useEffect(function () {
    if (!session || done) return undefined;
    function tick() {
      const remaining = Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000));
      setPaySecs(remaining);
      if (!remaining) {
        clearPaymentSession(uid);
        UI.toast("Payment time expired", "bad");
        navigate("/chat?u=" + encodeURIComponent(uid), { replace: true });
      }
    }
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
    tick();
    return function () { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); window.removeEventListener("pageshow", tick); };
  }, [session, done, uid, navigate]);

  function closePay() { navigate("/chat?u=" + encodeURIComponent(uid)); }
  function completePay() {
    if (!session || !validPaymentSession(session, uid)) { UI.toast("Payment session expired. Please start again.", "bad"); return; }
    if (!payUtr.trim()) { UI.toast("UTR number fill kijiye", "bad"); return; }
    const request = {
      id: "pr-" + (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)), uid, utr: payUtr.trim(),
      amount: session.amount, service: session.service, plan: session.plan,
      mode: session.mode, upiId: session.upi, status: "pending", at: Date.now()
    };
    if (!beginVerification(visitorId(), uid, request.id)) {
      UI.toast("Could not start verification. Please try again.", "bad");
      return;
    }
    Store.addPayReq(request);
    setDone(true);
    clearPaymentSession(uid);
    window.setTimeout(function () { navigate("/chat?u=" + encodeURIComponent(uid), { replace: true }); }, 800);
  }
  async function copyUpi() {
    let copied = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(session.upi); copied = true; } } catch (e) {}
    if (!copied) {
      const field = document.createElement("textarea");
      field.value = session.upi; field.setAttribute("readonly", ""); field.style.position = "fixed"; field.style.opacity = "0";
      document.body.appendChild(field); field.select();
      try { copied = document.execCommand("copy"); } catch (e) { copied = false; }
      field.remove();
    }
    UI.toast(copied ? "UPI ID copied" : "Could not copy UPI ID. Please copy it manually.", copied ? "ok" : "bad");
  }
  function payLater() {
    UI.toast("Payment ke bina service provide nahi ki jayegi", "bad");
    navigate("/chat?u=" + encodeURIComponent(uid));
  }

  const canReopen = session && recipient.status === "ready" && recipient.upi === session.upi && validPaymentSession(session, uid);
  return (
    <Chrome full bodyStyle={{ display: "flex", flexDirection: "column", minHeight: 0 }} bar={<>
      <button className="icon-btn" type="button" aria-label="Back to chat" onClick={closePay}><IcoBack /></button>
      <b className="pay-page-title">Payment details</b><div style={{ flex: 1 }}></div>
    </>}>
      <div className="pay-page utr-page">
        {!session ? (
          <div className="utr-card utr-empty" role="status">
            <h2>No active payment</h2><p>Return to the chat and tap Pay now to open your UPI app.</p>
            <button className="btn" type="button" onClick={closePay}>Back to chat</button>
          </div>
        ) : (<>
          <div className="utr-card utr-recipient">
            <span className="utr-avatar" dangerouslySetInnerHTML={{ __html: UI.avatarHTML(user, 48, true) }} />
            <div className="utr-person"><span>Payment for</span><strong>{user.name}</strong><small>{session.service || "Service"} · {session.plan || "—"}</small></div>
            <strong className="utr-amount">{session.amount}</strong>
          </div>
          <div className="utr-card utr-instructions">
            <div className="utr-step-icon" aria-hidden="true">#</div>
            <div><h2>Enter your UTR number</h2><p>After paying in your UPI app, enter the UTR or transaction reference from your receipt.</p></div>
          </div>
          <div className="utr-details">
            <div><span>UPI ID</span><strong>{session.upi}</strong><button type="button" onClick={copyUpi} aria-label="Copy UPI ID">Copy</button></div>
            <div><span>Time remaining</span><strong id="payTimer">{mmss(paySecs)}</strong></div>
          </div>
          <div className="compact-pay-input">
            <label htmlFor="payUtrInput">UTR number</label>
            <input id="payUtrInput" type="text" value={payUtr} onChange={function (e) { setPayUtr(e.target.value); }} placeholder="Enter UTR number" autoComplete="off" disabled={done} />
          </div>
          <div className="pay-actions">
            <button className="btn ghost sm" type="button" id="payLater" onClick={payLater} disabled={done}>Pay later</button>
            <button className="btn sm" type="button" id="payDone" onClick={completePay} disabled={!payUtr.trim() || done || !paySecs}>{done ? "Submitted ✓" : "Payment Complete"}</button>
          </div>
          {canReopen && !done && <a className="utr-reopen" href={upiPaymentUri(session.upi, session.amount)}>Open UPI app again</a>}
          {recipient.status === "ready" && recipient.upi !== session.upi && <p className="utr-warning">Payment details have changed. Submit only the UTR for your original payment above; to pay again, return to chat.</p>}
        </>)}
      </div>
    </Chrome>
  );
}
