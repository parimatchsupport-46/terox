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

export default function Payment() {
  useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uid = params.get("uid") || "";
  const user = Store.user(uid);

  const [payUtr, setPayUtr] = useState("");
  const [qrError, setQrError] = useState(false);
  const qr = Store.qr();
  const qrAvailable = !!qr && (/^https?:\/\//i.test(qr) || /^data:image\//i.test(qr));
  useEffect(function () { setQrError(false); }, [qr]);
  const [paySecs, setPaySecs] = useState(900);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  // derive payment details from store
  const picks = Store.picksOf(Store.thread(uid).messages);
  const amount = picks.amount || "";
  const service = picks.mode || picks.svc || "";
  const plan = picks.d || "";
  const mode = picks.mode || "";

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

  function payLater() {
    UI.toast("Payment ke bina service provide nahi ki jayegi", "bad");
    navigate("/chat?u=" + encodeURIComponent(uid));
  }

  // QR rendering
  function renderQR() {
    if (qrAvailable && !qrError)
      return <img src={qr} alt="Payment QR code" className="pay-qr-img" onError={function () { setQrError(true); }} />;
    return null;
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
      <div className="pay-page">
        {/* payment summary */}
        <div className="pay-summary card">
          <div className="pay-summary-head">
            <span className="avatar s48 t-accent" dangerouslySetInnerHTML={{ __html: UI.avatarHTML(user, 48, true) }} />
            <div>
              <b>{user.name}</b>
              <p className="muted">{service || "Service"} · {plan || "—"}</p>
            </div>
          </div>
          <div className="pay-summary-amount">
            <span className="pay-to">Amount to pay</span>
            <span className="pay-amt">{amount || "—"}</span>
          </div>
        </div>

        {/* QR + timer */}
        <div className="pay-qr-section card">
          <h2 className="pay-section-title">Scan to pay</h2>
          <p className="pay-section-subtitle">Open any UPI app and scan the QR code</p>
          <div className="pay-qr-large" id="payQrLarge">
            {renderQR()}
            <span className="pay-qr-unavailable" hidden={qrAvailable && !qrError}>QR code unavailable. Please contact support.</span>
          </div>
          <div className="pay-timer-bar">
            <span className="pay-timer-ic">⏰</span>
            <span className="pay-timer-txt">Payment valid for</span>
            <span className="pay-timer" id="payTimer">{mmss(paySecs)}</span>
          </div>
          <p className="pay-scan-hint">QR scan karke payment karo, UTR number niche daalo</p>
        </div>

        {/* UTR */}
        <div className="pay-form card">
          <div className="pay-utr">
            <label htmlFor="payUtrInput">UTR Number</label>
            <input
              id="payUtrInput"
              type="text"
              value={payUtr}
              onChange={function (e) { setPayUtr(e.target.value); }}
              placeholder="Enter UTR Number"
              autoComplete="off"
              disabled={done}
            />
          </div>
        </div>

        {/* actions */}
        <div className="pay-actions">
          <button className="btn ghost sm" type="button" id="payLater" onClick={payLater} disabled={done}>Pay later</button>
          <button className="btn sm" type="button" id="payDone" onClick={completePay} disabled={!payUtr.trim() || done || !qrAvailable || qrError}>
            {done ? "Submitted ✓" : "Payment Complete"}
          </button>
        </div>
      </div>
    </Chrome>
  );
}
