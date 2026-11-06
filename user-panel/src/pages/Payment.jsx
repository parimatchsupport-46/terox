/* ==========================================================================
   Payment.jsx — standalone payment page (replaces the old popup dialog).
   Shows QR code, timer, payment details and UTR input.
   Triggered when user taps "Pay now" in chat.
   ========================================================================== */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Chrome from "../components/Chrome.jsx";
import Store from "../lib/store.js";
import useStore from "../lib/useStore.js";
import UI from "../lib/ui.js";
import { IcoBack } from "../components/icons.jsx";
import { QRCodeSVG } from "qrcode.react";
import { db, doc, onSnapshot } from "../lib/firebase.js";
import { upiPaymentUri } from "../lib/upi.js";

export default function Payment() {
  useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uid = params.get("uid") || "";
  const user = Store.user(uid);

  const [payUtr, setPayUtr] = useState("");
  const [upi, setUpi] = useState("");
  const [upiStatus, setUpiStatus] = useState("loading");
  useEffect(function () {
    // Require a server-confirmed recipient instead of showing a stale cached QR.
    return onSnapshot(doc(db, "data", "terox.upi.v1"), { includeMetadataChanges: true }, function (snap) {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.metadata.fromCache) { setUpi(""); setUpiStatus("offline"); return; }
      const value = snap.exists() && typeof snap.data().value === "string" ? snap.data().value : "";
      setUpi(value);
      setUpiStatus(value ? "ready" : "missing");
    }, function () { setUpi(""); setUpiStatus("error"); });
  }, []);
  const [paySecs, setPaySecs] = useState(900);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  // derive payment details from store
  const picks = Store.picksOf(Store.thread(uid).messages);
  const amount = picks.amount || "";
  const service = picks.mode || picks.svc || "";
  const plan = picks.d || "";
  const mode = picks.mode || "";
  const paymentUri = upiStatus === "ready" ? upiPaymentUri(upi, amount) : "";

  function mmss(s) {
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
  }

  // timer countdown
  useEffect(function () {
    if (done) return undefined;
    timerRef.current = setInterval(function () {
      setPaySecs(function (s) {
        if (s <= 1) {
          clearInterval(timerRef.current);
          UI.toast("Payment time expire ho gya", "bad");
          navigate("/chat?u=" + encodeURIComponent(uid));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return function () { clearInterval(timerRef.current); };
  }, [done, navigate, uid]);

  function closePay() {
    navigate("/chat?u=" + encodeURIComponent(uid));
  }

  function completePay() {
    if (!payUtr || !payUtr.trim()) { UI.toast("UTR number fill kijiye", "bad"); return; }
    var req = {
      id: "pr" + Date.now().toString(36),
      uid: uid,
      utr: payUtr.trim(),
      amount: amount,
      service: service,
      plan: plan,
      mode: mode,
      status: "pending",
      at: Date.now()
    };
    Store.addPayReq(req);
    setDone(true);
    window.setTimeout(function () {
      navigate("/chat?u=" + encodeURIComponent(uid));
    }, 800);
  }

  async function copyUpi() {
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(upi);
        copied = true;
      }
    } catch (e) { /* Try the fallback below. */ }
    if (!copied) {
      const field = document.createElement("textarea");
      field.value = upi;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try { copied = document.execCommand("copy"); } catch (e) { copied = false; }
      field.remove();
    }
    UI.toast(copied ? "UPI ID copied" : "Could not copy UPI ID. Please copy it manually.", copied ? "ok" : "bad");
  }

  function payLater() {
    UI.toast("Payment ke bina service provide nahi ki jayegi", "bad");
    navigate("/chat?u=" + encodeURIComponent(uid));
  }

  return (
    <Chrome
      full
      bodyStyle={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      bar={<>
        <button className="icon-btn" type="button" aria-label="Back to chat" onClick={closePay}><IcoBack /></button>
        <b className="pay-page-title">Payment</b>
        <div style={{ flex: 1 }}></div>
      </>}
    >
      <div className="pay-page compact-pay">
        <div className="compact-pay-summary">
          <div><span className="compact-pay-label">Amount to pay</span><strong className="pay-amt">{amount || "—"}</strong></div>
          <span className="compact-pay-service">{service || "Service"} · {plan || "—"}</span>
        </div>
        <div className="compact-pay-panel">
          <h2 className="pay-section-title">Scan & pay</h2>
          <div className="pay-qr-large" id="payQrLarge">
            {paymentUri ? <QRCodeSVG value={paymentUri} size={200} level="M" marginSize={4} title="UPI payment QR code" /> : (
              <span className="pay-qr-unavailable" role="status">
                {upiStatus === "loading" ? "Loading payment details…" : upiStatus === "offline" ? "Connect to the internet to load payment details." : upiStatus === "error" ? "Could not load payment details. Please try again." : !upi ? "UPI ID not set. Please contact support." : "Payment details unavailable. Please return to chat and select a plan."}
              </span>
            )}
          </div>
          {paymentUri && <div className="compact-upi"><span>UPI ID <b>{upi}</b></span><button type="button" onClick={copyUpi} aria-label="Copy UPI ID">Copy</button></div>}
          <div className="compact-timer"><span>Payment valid for</span><strong id="payTimer">{mmss(paySecs)}</strong></div>
        </div>
        <div className="compact-pay-input">
          <label htmlFor="payUtrInput">UTR number</label>
          <input id="payUtrInput" type="text" value={payUtr} onChange={function (e) { setPayUtr(e.target.value); }} placeholder="Enter UTR number" autoComplete="off" disabled={done} />
        </div>
        <div className="pay-actions">
          <button className="btn ghost sm" type="button" id="payLater" onClick={payLater} disabled={done}>Pay later</button>
          <button className="btn sm" type="button" id="payDone" onClick={completePay} disabled={!payUtr.trim() || done || !paymentUri}>{done ? "Submitted ✓" : "Payment Complete"}</button>
        </div>
      </div>
    </Chrome>
  );
}
