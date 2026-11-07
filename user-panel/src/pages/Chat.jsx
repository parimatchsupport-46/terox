/* ==========================================================================
   Chat.jsx — option-only thread, action sheet and scripted
   peer. The thread always starts empty: A taps "Start chat" to say hello, B
   answers on the same beat as before (4s pause, 3s of typing, then the rate
   card), every option is a button that sends that choice, and the last step
   opens the payment page. Markup, classes and ids are the ones the
   stylesheet already knew; only the plumbing is React.
   ========================================================================== */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Store from "../lib/store.js";
import { visitorId } from "../lib/visitor.js";
import { readVerification, finishVerification } from "../lib/verificationSession.js";
import UI from "../lib/ui.js";
import useStore from "../lib/useStore.js";
import Chrome from "../components/Chrome.jsx";
import { IcoBack, IcoCopy, IcoTrash } from "../components/icons.jsx";
import useUpiRecipient from "../lib/useUpiRecipient.js";
import { upiPaymentUri } from "../lib/upi.js";
import { makePaymentSession, savePaymentSession } from "../lib/paymentSession.js";

function snippet(s) {
  const one = String(s).replace(/\s+/g, " ").trim();
  return one.length > 72 ? one.slice(0, 71) + "…" : one;
}

export default function Chat() {
  const bump = useStore();
  const loc = useLocation();
  const wanted = new URLSearchParams(loc.search).get("u");
  const fallback = (function () { const o = Store.order()[0]; return o ? o.id : Store.USERS[0].id; })();
  const user = Store.user(wanted && Store.user(wanted).id === wanted ? wanted : fallback);
  const uid = user.id;
  const first = user.name.split(" ")[0];
  const msgs = Store.thread(uid).messages;
  // Already-present messages remain still; only messages added in this visit animate.
  const initialMessages = useRef({ uid: uid, ids: new Set(msgs.map(function (m) { return m.id; })) });
  if (initialMessages.current.uid !== uid) {
    initialMessages.current = { uid: uid, ids: new Set(msgs.map(function (m) { return m.id; })) };
  }

  const typing = Store.typingOn() && Store.typingName() === user.name;
  const navigate = useNavigate();
  const recipient = useUpiRecipient();
  const [sheetId, setSheetId] = useState(null);
  const [sheetOn, setSheetOn] = useState(false);
  const [sheetScrim, setSheetScrim] = useState(false);
  const [sheetShow, setSheetShow] = useState(false);
  const [sheetAria, setSheetAria] = useState(undefined);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState("verifying"); // "verifying" | "accepted" | "rejected"
  const browserId = visitorId();
  const [activeVerification, setActiveVerification] = useState(function () { return readVerification(browserId, uid); });
  const handledVerification = useRef("");

  const thread = useRef(null);
  const sheetBtn = useRef(null);
  const lastFocus = useRef(null);
  const seen = useRef(0);

  const sheetMsg = sheetId ? Store.find(uid, sheetId) : null;
  const trackedRequest = activeVerification ? Store.payReqs().find(function (r) { return r.id === activeVerification && r.uid === uid; }) : null;

  document.title = user.name + " · Terox Chat";

  useEffect(function () {
    Store.markRead(uid);
    Store.cancelReply(uid);
    const last = Store.thread(uid).messages.slice(-1)[0];
    if (last && last.from === "me" && Store.NEXT[last.kind]) Store.queueReply(uid, Store.NEXT[last.kind]);
    setSheetId(null); setSheetOn(false); setSheetScrim(false);
    seen.current = 0;
    /* no cancelReply in cleanup: a reply in progress keeps going when the
       user navigates away, so the typing bar shows on the home page too */
  }, [uid]);

  useEffect(function () {
    const el = thread.current;
    if (!el) return;
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smooth = !reduceMotion && seen.current !== 0 && msgs.length !== seen.current;
    seen.current = msgs.length;
    if (el.scrollTo) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    else el.scrollTop = el.scrollHeight;
  }, [msgs.length, typing]);

  /* ---------- the flow's own sends ---------- */
  function startChat() {
    Store.append(uid, "Hello 👋", { kind: "start" });
    Store.queueReply(uid, "services");
  }
  function sendPick(text, kind, pick) {
    const peer = Store.thread(uid).messages.filter(function (m) { return m.from === "them"; }).pop();
    const opts = { kind: kind, pick: pick || null };
    if (peer) opts.replyTo = peer.id;
    Store.append(uid, text, opts);
    Store.queueReply(uid, Store.NEXT[kind] || null);
  }

  /* ---------- action sheet ---------- */
  function openSheet(id) {
    lastFocus.current = document.activeElement;
    setSheetId(id);
    setSheetOn(true);
    setSheetScrim(true);
    document.body.classList.add("locked");
    setSheetAria("false");
    requestAnimationFrame(function () {
      setSheetShow(true);
      if (sheetBtn.current) sheetBtn.current.focus({ preventScroll: true });
    });
  }
  function closeSheet() {
    setSheetOn(false);
    setSheetShow(false);
    setSheetAria("true");
    window.setTimeout(function () { setSheetScrim(false); }, 200);
    document.body.classList.remove("locked");
    if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus({ preventScroll: true });
  }
  function act(kind) {
    const m = sheetId ? Store.find(uid, sheetId) : null;
    if (!m) return closeSheet();
    if (kind === "copy") {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m.text).then(function () { UI.toast("Message copied", "ok"); });
      closeSheet();
      return;
    }
    if (kind === "delete") {
      const gone = Store.remove(uid, m.id);
      closeSheet();
      if (gone) {
        UI.toast("Message deleted", "bad", {
          label: "Undo",
          onClick: function () { Store.restore(uid, gone.index, gone.message); bump(); }
        });
      }
    }
  }

  /* Save the exact recipient and plan before the UPI app is opened. */
  function openPay(e, pick) {
    e.stopPropagation();
    const session = makePaymentSession(uid, recipient.upi, pick);
    if (!session) { e.preventDefault(); UI.toast("Payment details are unavailable", "bad"); return; }
    savePaymentSession(session);
    // Keep the UTR page in browser history before the native UPI link opens.
    navigate("/pay?uid=" + encodeURIComponent(uid), { state: { payment: session } });
  }
  function closeVerify() {
    if (verifyStatus === "rejected" && activeVerification) {
      finishVerification(browserId, uid, activeVerification);
      setActiveVerification(null);
    }
    setVerifyOpen(false);
  }

  /* Only this browser's explicitly submitted request can open this dialog. */
  useEffect(function () {
    if (!trackedRequest || !activeVerification) return;
    const state = activeVerification + ":" + trackedRequest.status;
    if (handledVerification.current === state) return;
    handledVerification.current = state;
    if (trackedRequest.status === "pending") {
      setVerifyStatus("verifying");
      setVerifyOpen(true);
    } else if (trackedRequest.status === "rejected") {
      setVerifyStatus("rejected");
      setVerifyOpen(true);
      UI.toast("Payment rejected — fir se try karo", "bad");
    } else if (trackedRequest.status === "accepted") {
      if (Store.acknowledgePayment(uid, activeVerification)) UI.toast("Payment verified", "ok");
      finishVerification(browserId, uid, activeVerification);
      setActiveVerification(null);
      setVerifyOpen(false);
    }
  }, [uid, browserId, activeVerification, trackedRequest && trackedRequest.id, trackedRequest && trackedRequest.status]);

  useEffect(function () {
    function key(e) { if (e.key === "Escape" && sheetOn) closeSheet(); }
    document.addEventListener("keydown", key);
    return function () { document.removeEventListener("keydown", key); };
  }, [sheetOn]);
  useEffect(function () { return function () { document.body.classList.remove("locked"); }; }, []);

  function jumpTo(id) {
    const el = thread.current;
    const target = el && el.querySelector('[data-id="' + id + '"]');
    if (!target) return;
    if (target.scrollIntoView) target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.classList.add("flash");
    window.setTimeout(function () { target.classList.remove("flash"); }, 1200);
  }

  /* ---------- the option blocks B sends ---------- */
  function rateCard(secKey) {
    /* one section only — the service the user already picked at the top.
       The head and its rows are siblings inside .opts, no wrapper, so the
       flex gaps line up */
    const kids = [];
    const sec = Store.SECTIONS.filter(function (s) { return s.key === secKey; })[0] || Store.SECTIONS[0];
    kids.push(<p className="opts-h" key={sec.key + "-h"}>{sec.name}</p>);
    Store.RATE.forEach(function (r) {
      const amt = Store.money(secKey === "x" ? r.x : r.v);
      kids.push(
        <button className="opt" type="button" key={secKey + r.d} onClick={function (e) {
          e.stopPropagation();
          sendPick(sec.name + " · " + r.d + " · " + amt, "pick-plan", { d: r.d, sec: secKey, svc: sec.name });
        }}>
          <span className="lbl">{r.d}</span>
          <span className="price">{amt}</span>
        </button>
      );
    });
    return <div className="opts">{kids}</div>;
  }

  function servicePicker() {
    /* the two choices that open right after "Start chat": Call (voice) or
       Video Call. Tapping one sends pick-service and B answers with that
       service's rate card */
    const opts = [
      { ic: "📞", name: "Call", key: "v", svc: "Voice calling", mode: "Voice calling" },
      { ic: "🎥", name: "Video Call", key: "x", svc: "Video calling", mode: "Video calling" }
    ];
    return (
      <div className="opts">
        {opts.map(function (o) {
          return (
            <button className="opt big" type="button" key={o.key} onClick={function (e) {
              e.stopPropagation();
              sendPick(o.name + " ✅", "pick-service", { key: o.key, svc: o.svc, sec: o.key, mode: o.mode });
            }}>
              <span className="ic">{o.ic}</span>
              <span className="lbl">{o.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function payAsk(m) {
    const p = m.pick || {};
    const rows = [["Service", p.mode || p.svc || "—"], ["Duration", p.d || "—"], ["Amount", p.amount || "—"]];
    return (
      <div className="askpay">
        <div className="sum">
          {rows.map(function (pair) {
            return <div key={pair[0]}><span>{pair[0]}</span><b>{pair[1]}</b></div>;
          })}
        </div>
        {recipient.status === "ready" && upiPaymentUri(recipient.upi, p.amount) ? (
          <a className="pay-now" href={upiPaymentUri(recipient.upi, p.amount)} onClick={function (e) { openPay(e, p); }}>{"Pay now " + (p.amount || "")}</a>
        ) : (
          <button className="pay-now" type="button" disabled>{recipient.status === "loading" ? "Loading payment details…" : "Payment unavailable"}</button>
        )}
        <p className="opts-n">Pay in your UPI app, then return here to enter your UTR number.</p>
        {recipient.status === "offline" && <p className="opts-n">Connect to the internet to load payment details.</p>}
        {(recipient.status === "missing" || recipient.status === "error") && <p className="opts-n">Payment details unavailable. Please contact support.</p>}
      </div>
    );
  }

  function bubble(m) {
    const mine = m.from === "me";
    const quoted = m.replyTo ? Store.find(uid, m.replyTo) : null;
    return (
      <div key={m.id} className={"msg" + (mine ? " mine" : "") + (initialMessages.current.ids.has(m.id) ? "" : " msg-arrive")} data-id={m.id}>
        {!mine && <span className="av" aria-hidden="true" dangerouslySetInnerHTML={{ __html: UI.avatarHTML(user, 36, false) }} />}
        <div
          className="bubble"
          role="button"
          tabIndex="0"
          aria-label="Message options"
          onClick={function (e) { if (e.target.closest && e.target.closest(".opt, .pay-now")) return; openSheet(m.id); }}
          onKeyDown={function (e) { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openSheet(m.id); } }}
        >
          {m.replyTo && (quoted ? (
            <span className="quote" onClick={function (e) { e.stopPropagation(); jumpTo(m.replyTo); }}>
              <b>{quoted.from === "me" ? "You" : user.name}</b>
              <span className="txt">{snippet(quoted.text)}</span>
            </span>
          ) : (
            <span className="quote busted">Original message deleted</span>
          ))}
          <span className="mtext">{m.text}</span>
          {!mine && m.kind === "services" && servicePicker()}
          {!mine && m.kind === "rates" && rateCard(m.pick && m.pick.sec)}
          {!mine && m.kind === "pay" && payAsk(m)}
          <span className={"t" + (m.editedAt ? " edited" : "")}>{Store.time(m.at) + (m.editedAt ? " · edited" : "")}</span>
        </div>
      </div>
    );
  }

  /* ---------- render ---------- */
  let lastDay = null;
  const rows = [];
  msgs.forEach(function (m) {
    const day = new Date(m.at).toDateString();
    if (day !== lastDay) {
      lastDay = day;
      rows.push(<span className="badge badge-secondary day" key={"d" + m.id}>{Store.dayStamp(m.at)}</span>);
    }
    rows.push(bubble(m));
  });

  const overlays = (
    <>
      <button className={"scrim" + (sheetShow ? " show" : "")} id="sheetScrim" hidden={!sheetScrim} aria-hidden="true" tabIndex={-1} onClick={closeSheet} />
      <div className={"sheet" + (sheetOn ? " open" : "")} id="sheet" role="dialog" aria-modal="true" aria-label="Message actions" aria-hidden={sheetAria}>
        <div className="grab"></div>
        <div className="sheet-msg">
          <p className="txt" id="sheetText">{sheetMsg ? sheetMsg.text : "—"}</p>
          <div className="stamp">
            <span className="badge badge-secondary" id="sheetDate">{sheetMsg ? Store.dateLong(sheetMsg.at) : "—"}</span>
            <span className="badge badge-secondary" id="sheetTime">{sheetMsg ? Store.time(sheetMsg.at) : "—"}</span>
            <span className="badge badge-secondary" id="sheetFrom">{sheetMsg ? (sheetMsg.from === "me" ? "You" : user.name) : "—"}</span>
            <span className="badge badge-secondary" id="sheetEdited" hidden={!(sheetMsg && sheetMsg.editedAt)}>Edited</span>
          </div>
        </div>
        <div className="sheet-actions">
          <button type="button" data-act="copy" ref={sheetBtn} onClick={function () { act("copy"); }}><IcoCopy />Copy</button>
          <button type="button" data-act="delete" className="danger" onClick={function () { act("delete"); }}><IcoTrash />Delete</button>
        </div>
        <div className="sheet-foot">
          <button className="btn ghost block sm" type="button" id="sheetClose" onClick={closeSheet}>Close</button>
        </div>
      </div>

      <div className="verify-backdrop" id="verifyScrim" hidden={!verifyOpen} aria-hidden="true" />
      <div className="dlg center" id="verifyDlg" role="dialog" aria-modal="true" aria-labelledby="verifySub" hidden={!verifyOpen}>
        <div className="dlg-box verify-box">
          {verifyStatus === "verifying" && (
            <>
              <div className="verify-loader" aria-hidden="true"><span></span><i>₹</i></div>
              <b id="verifySub">Payment Verification in Progress...</b>
              <p className="verify-sub">Your payment is being verified. Please wait, this may take a moment.</p>
            </>
          )}
          {verifyStatus === "accepted" && (
            <>
              <div className="verify-icon verify-ok">✅</div>
              <b id="verifySub">Payment Verified!</b>
              <p className="verify-sub">Your payment has been verified. Service is starting now.</p>
            </>
          )}
          {verifyStatus === "rejected" && (
            <>
              <div className="verify-icon verify-bad">❌</div>
              <b id="verifySub">Payment Rejected</b>
              <p className="verify-sub">Your payment was rejected. Please try again with correct details.</p>
            </>
          )}
          <button className="btn ghost sm" type="button" id="verifyClose" onClick={closeVerify}>Close</button>
        </div>
      </div>
    </>
  );

  return (
    <Chrome
      full
      overlays={overlays}
      bodyStyle={{ display: "flex", flexDirection: "column", minHeight: 0 }}
      bar={<>
        <Link className="icon-btn" to="/" aria-label="Back to all users"><IcoBack /></Link>
        <Link className="peer-link" id="peerProfile" to={"/user?u=" + encodeURIComponent(uid)} aria-label="View this profile">
          <span className="avatar s40 t-accent" id="peerAvatar" dangerouslySetInnerHTML={{ __html: UI.avatarHTML(user, 40, true) }} />
          <span className="titles">
            <b id="peerName">{user.name}</b>
            <span><span className="dot-status online"></span> <span id="peerStatus">Online</span></span>
          </span>
        </Link>
      </>}
    >
      <div className="thread" id="thread" aria-live="polite" ref={thread}>
        {msgs.length === 0 ? (
          <div className="chat-start">
            <b>{"Say hello to " + first + " 👋"}</b>
            <p>{"Abhi tak koi message nahi hai. Start dabaiye — " + first + " rate card bhejenge, usme se apna plan chun lijiye."}</p>
            <button className="btn block" type="button" id="startChat" onClick={startChat}>Start chat — say hello 👋</button>
          </div>
        ) : rows}
        {typing && (
          <div className="chat-typing" role="status" aria-label={user.name + " is typing"}>
            <span className="chat-typing-avatar" aria-hidden="true" dangerouslySetInnerHTML={{ __html: UI.avatarHTML(user, 36, false) }} />
            <div className="chat-typing-content">
              <span className="chat-typing-name">{first} is typing</span>
              <span className="chat-typing-bubble" aria-hidden="true"><span></span><span></span><span></span></span>
            </div>
          </div>
        )}
      </div>
    </Chrome>
  );
}
