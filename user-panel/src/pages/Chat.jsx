/* ==========================================================================
   Chat.jsx — thread, composer, the tap-to-open action sheet and the scripted
   peer. The thread always starts empty: A taps "Start chat" to say hello, B
   answers on the same beat as before (4s pause, 3s of typing, then the rate
   card), every option is a button that sends that choice, and the last step
   opens the payment dialog. Markup, classes and ids are the ones the
   stylesheet already knew; only the plumbing is React.
   ========================================================================== */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Store from "../lib/store.js";
import UI from "../lib/ui.js";
import useStore from "../lib/useStore.js";
import Chrome from "../components/Chrome.jsx";
import QR_DEFAULT from "../lib/qr.js";
import { IcoBack, IcoClose, IcoSend, IcoEmoji, IcoReply, IcoCopy, IcoEdit, IcoTrash } from "../components/icons.jsx";

const EMOJI = ["👍", "🙏", "😄", "🔥", "🎉", "✅", "🚀", "❤️", "😅", "🤝"];

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
  const prefs = Store.prefs();

  const typing = Store.typingOn();
  const [raw, setRaw] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sheetId, setSheetId] = useState(null);
  const [sheetOn, setSheetOn] = useState(false);
  const [sheetScrim, setSheetScrim] = useState(false);
  const [sheetShow, setSheetShow] = useState(false);
  const [sheetAria, setSheetAria] = useState(undefined);
  const [payOpen, setPayOpen] = useState(false);
  const [payMsg, setPayMsg] = useState(null);
  const [payUtr, setPayUtr] = useState("");
  const [payProof, setPayProof] = useState(null);
  const [paySecs, setPaySecs] = useState(900);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState("verifying"); // "verifying" | "accepted" | "rejected"
  const [verifyReqId, setVerifyReqId] = useState(null);

  const thread = useRef(null);
  const area = useRef(null);
  const sheetBtn = useRef(null);
  const lastFocus = useRef(null);
  const seen = useRef(0);

  const picks = Store.picksOf(msgs);
  const editMsg = editingId ? Store.find(uid, editingId) : null;
  const sheetMsg = sheetId ? Store.find(uid, sheetId) : null;
  const orig = replyTo ? Store.find(uid, replyTo) : null;

  document.title = user.name + " · Terox Chat";

  useEffect(function () {
    Store.markRead(uid);
    Store.cancelReply(uid);
    const last = Store.thread(uid).messages.slice(-1)[0];
    if (last && last.from === "me" && Store.NEXT[last.kind]) Store.queueReply(uid, Store.NEXT[last.kind]);
    setRaw(""); setReplyTo(null); setEditingId(null);
    setSheetId(null); setSheetOn(false); setSheetScrim(false);
    setPayMsg(null); setPayOpen(false);
    seen.current = 0;
    /* restore a pending payment verification if the user navigates back */
    var pendingReq = Store.payReqForUser(uid);
    if (pendingReq) {
      setVerifyReqId(pendingReq.id);
      if (pendingReq.status === "accepted") {
        setVerifyStatus("accepted");
        setVerifyOpen(true);
        var threadMsgs = Store.thread(uid).messages;
        var hasAck = threadMsgs.some(function (m) { return m.kind === "ack"; });
        if (!hasAck) {
          var p2 = Store.picksOf(threadMsgs);
          Store.receive(uid, "Payment mil gaya ✅ " + (p2.mode || "Call") + " · " + (p2.d || "") + " — ab connect kar raha hoon.", { kind: "ack" });
        }
      } else if (pendingReq.status === "rejected") {
        setVerifyStatus("rejected");
        setVerifyOpen(true);
      } else {
        setVerifyStatus("verifying");
        setVerifyOpen(true);
      }
    } else {
      setVerifyReqId(null);
      setVerifyStatus("verifying");
      setVerifyOpen(false);
    }
    /* no cancelReply in cleanup: a reply in progress keeps going when the
       user navigates away, so the typing bar shows on the home page too */
  }, [uid]);

  useEffect(function () {
    const el = thread.current;
    if (!el) return;
    const smooth = seen.current !== 0 && msgs.length !== seen.current;
    seen.current = msgs.length;
    if (el.scrollTo) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    else el.scrollTop = el.scrollHeight;
  }, [msgs.length, typing]);

  /* the composer only takes an inline height once it has been used - before
     that it keeps its natural one, which is what the page did on load */
  const sized = useRef(false);
  useEffect(function () {
    const el = area.current;
    if (!el || (!raw && !sized.current)) return;
    sized.current = true;
    el.style.height = "auto";
    el.style.height = Math.min(120, Math.max(44, el.scrollHeight)) + "px";
  }, [raw]);

  /* ---------- composer ---------- */
  const len = raw.length;
  const sendDisabled = !raw.trim() || (!!editingId && raw.trim() === ((editMsg && editMsg.text) || ""));

  function submit(e) {
    e.preventDefault();
    const text = raw.trim();
    if (!text) return;
    if (editingId) {
      Store.edit(uid, editingId, text);
      setEditingId(null);
      setRaw("");
      UI.toast("Message edited", "ok");
      return;
    }
    Store.append(uid, text, replyTo ? { replyTo: replyTo } : null);
    setReplyTo(null);
    setRaw("");
    const last = Store.thread(uid).messages.slice(-1)[0];
    if (last && !Store.NEXT[last.kind]) {
      const lastPeer = Store.thread(uid).messages.filter(function (m) { return m.from === "them"; }).pop();
      if (lastPeer && Store.PENDING[lastPeer.kind]) Store.queueReply(uid, Store.PENDING[lastPeer.kind]);
    }
  }

  function keydown(e) {
    const enterSends = prefs.enterToSend;
    if (e.key === "Enter" && !e.shiftKey && (enterSends || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit(e);
    }
  }

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
    if (kind === "reply") {
      setReplyTo(m.id); setEditingId(null); closeSheet();
      if (area.current) area.current.focus({ preventScroll: true });
      return;
    }
    if (kind === "copy") {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m.text).then(function () { UI.toast("Message copied", "ok"); });
      closeSheet();
      return;
    }
    if (kind === "edit") {
      setEditingId(m.id); setReplyTo(null); setRaw(m.text); closeSheet();
      if (area.current) { area.current.focus({ preventScroll: true }); const n = m.text.length; if (area.current.setSelectionRange) area.current.setSelectionRange(n, n); }
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

  /* ---------- payment dialog ---------- */
  function openPay(m) { setPayMsg(m); setPayUtr(""); setPayProof(null); setPaySecs(900); setPayOpen(true); document.body.classList.add("locked"); }
  function closePay() { setPayOpen(false); setPayMsg(null); setPayUtr(""); document.body.classList.remove("locked"); }
  function mmss(s) { var m = Math.floor(s / 60); var r = s % 60; return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r; }
  /* tapping "Payment Complete" (UTR must be filled) creates a payment request
     in the store, closes the pay dialog and opens the verification popup.
     The popup stays open until the admin panel accepts or rejects the request. */
  function completePay() {
    if (!payUtr || !payUtr.trim()) { UI.toast("UTR number fill kijiye", "bad"); return; }
    var p = (payMsg && payMsg.pick) || {};
    var req = {
      id: "pr" + Date.now().toString(36),
      uid: uid,
      utr: payUtr.trim(),
      amount: p.amount || "",
      service: p.mode || p.svc || "",
      plan: p.d || "",
      mode: p.mode || "",
      proof: payProof || null,
      status: "pending",
      at: Date.now()
    };
    Store.addPayReq(req);
    setVerifyReqId(req.id);
    setVerifyStatus("verifying");
    closePay();
    setVerifyOpen(true);
  }
  function closeVerify() { setVerifyOpen(false); setVerifyStatus("verifying"); setVerifyReqId(null); }

  /* poll the store for the payment request status while the verify popup is
     open. When the admin accepts or rejects, update the popup and send the
     confirm-ack message. */
  useEffect(function () {
    if (!verifyOpen || !verifyReqId) return undefined;
    var req = Store.payReqs().filter(function (r) { return r.id === verifyReqId; })[0];
    if (!req) return undefined;
    if (req.status !== "pending" && req.status !== verifyStatus) {
      setVerifyStatus(req.status);
      if (req.status === "accepted") {
        UI.toast("Payment verified ✅", "good");
        var picks2 = Store.picksOf(Store.thread(uid).messages);
        Store.receive(uid, "Payment mil gaya ✅ " + (picks2.mode || "Call") + " · " + (picks2.d || "") + " — ab connect kar raha hoon.", { kind: "ack" });
      } else if (req.status === "rejected") {
        UI.toast("Payment rejected — fir se try karo", "bad");
      }
    }
    var t = setInterval(function () {
      var r = Store.payReqs().filter(function (x) { return x.id === verifyReqId; })[0];
      if (r && r.status !== "pending" && r.status !== verifyStatus) {
        setVerifyStatus(r.status);
        if (r.status === "accepted") {
          UI.toast("Payment verified ✅", "good");
          var p2 = Store.picksOf(Store.thread(uid).messages);
          Store.receive(uid, "Payment mil gaya ✅ " + (p2.mode || "Call") + " · " + (p2.d || "") + " — ab connect kar raha hoon.", { kind: "ack" });
        } else if (r.status === "rejected") {
          UI.toast("Payment rejected — fir se try karo", "bad");
        }
      }
    }, 1500);
    return function () { clearInterval(t); };
  }, [verifyOpen, verifyReqId, verifyStatus]);

  function onProofFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { UI.toast("Image hi upload karo", "bad"); return; }
    if (f.size > 5 * 1024 * 1024) { UI.toast("Image 5MB se kam honi chahiye", "bad"); return; }
    var reader = new FileReader();
    reader.onload = function () { setPayProof(reader.result); };
    reader.readAsDataURL(f);
  }

  useEffect(function () {
    function key(e) { if (e.key === "Escape") { if (payOpen) closePay(); else if (sheetOn) closeSheet(); } }
    document.addEventListener("keydown", key);
    return function () { document.removeEventListener("keydown", key); };
  }, [payOpen, sheetOn]);
  /* countdown timer while the pay dialog is open (15-min QR validity) */
  useEffect(function () {
    if (!payOpen) return;
    var t = setInterval(function () { setPaySecs(function (s) { return s > 0 ? s - 1 : 0; }); }, 1000);
    return function () { clearInterval(t); };
  }, [payOpen]);
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
        <button className="pay-now" type="button" onClick={function (e) { e.stopPropagation(); openPay(m); }}>{"Pay now " + (p.amount || "")}</button>
        <p className="opts-n">Scan the QR to pay. Fill the UTR number and tap Payment Complete.</p>
      </div>
    );
  }

  function Bubble({ m }) {
    const mine = m.from === "me";
    const quoted = m.replyTo ? Store.find(uid, m.replyTo) : null;
    return (
      <div className={"msg" + (mine ? " mine" : "")} data-id={m.id}>
        {!mine && <span className="av" aria-hidden="true" dangerouslySetInnerHTML={{ __html: UI.avatarHTML(user, 36, false) }} />}
        <div
          className="bubble"
          role="button"
          tabIndex="0"
          aria-label="Message options"
          onClick={function (e) { if (e.target.closest && e.target.closest(".opt, .pay-now")) return; openSheet(m.id); }}
          onKeyDown={function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(m.id); } }}
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
    rows.push(<Bubble m={m} key={m.id} />);
  });

  const hint = prefs.enterToSend
    ? "Tap a message to reply, copy, edit or delete"
    : "Send button bhejta hai · Enter = new line";
  const pay = (payMsg && payMsg.pick) || {};

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
          <button type="button" data-act="reply" ref={sheetBtn} onClick={function () { act("reply"); }}><IcoReply />Reply</button>
          <button type="button" data-act="copy" onClick={function () { act("copy"); }}><IcoCopy />Copy</button>
          <button type="button" data-act="edit" onClick={function () { act("edit"); }}><IcoEdit />Edit</button>
          <button type="button" data-act="delete" className="danger" onClick={function () { act("delete"); }}><IcoTrash />Delete</button>
        </div>
        <div className="sheet-foot">
          <button className="btn ghost block sm" type="button" id="sheetClose" onClick={closeSheet}>Close</button>
        </div>
      </div>

      <button className="scrim" id="payScrim" hidden aria-hidden="true" tabIndex={-1} onClick={closePay} />
      <div className="dlg" id="payDlg" role="dialog" aria-modal="true" aria-labelledby="paySub" hidden={!payOpen}>
        <div className="dlg-box">
          <div className="dlg-head">
            <b id="paySub">{pay.amount ? "Pay " + pay.amount + " to " + first : "Payment"}</b>
            <button className="icon-btn" type="button" id="payClose" aria-label="Close payment" onClick={closePay}><IcoClose sw={2.4} /></button>
          </div>
          <div className="pay-body">
            <div className="pay-qr">{(function () {
              var qr = Store.qr();
              if (!qr) return <span dangerouslySetInnerHTML={{ __html: QR_DEFAULT }} />;
              if (qr.startsWith("http") || qr.startsWith("data:")) return <img src={qr} alt="QR code" className="pay-qr-img" />;
              return <span dangerouslySetInnerHTML={{ __html: QR_DEFAULT }} />;
            })()}</div>
            <dl className="pay-rows">
              <div><dt>To</dt><dd id="payTo">terox@ybl</dd></div>
              <div><dt>Service</dt><dd id="payService">{pay.mode || pay.svc || "—"}</dd></div>
              <div><dt>Plan</dt><dd id="payPlan">{pay.d || "—"}</dd></div>
              <div><dt>Amount</dt><dd id="payAmount">{pay.amount || "—"}</dd></div>
            </dl>
          </div>
          <div className="pay-timer-bar">
            <span className="pay-timer-ic">⏰</span>
            <span className="pay-timer-txt">Payment valid for</span>
            <span className="pay-timer" id="payTimer">{mmss(paySecs)}</span>
          </div>
          <div className="pay-utr">
            <label htmlFor="payUtrInput">UTR Number</label>
            <input id="payUtrInput" type="text" value={payUtr} onChange={function (e) { setPayUtr(e.target.value); }} placeholder="Enter UTR Number" autoComplete="off" inputMode="text" />
          </div>
          <div className="pay-proof">
            <label>Payment Proof (screenshot upload)</label>
            <div className="pay-proof-wrap">
              {payProof ? (
                <div className="pay-proof-preview">
                  <img src={payProof} alt="Payment proof" />
                  <button className="btn ghost sm" type="button" onClick={function () { setPayProof(null); }}>Remove</button>
                </div>
              ) : (
                <label className="btn ghost sm proof-upload-btn" type="button">
                  📷 Choose Image
                  <input type="file" accept="image/*" hidden onChange={onProofFile} />
                </label>
              )}
            </div>
            <p className="pay-proof-hint">UPI screenshot ya receipt upload karo</p>
          </div>
          <div className="dlg-foot">
            <button className="btn ghost sm" type="button" id="payLater" onClick={function () { closePay(); UI.toast("Payment ke bina service provide nahi ki jayegi", "bad"); }}>Pay later</button>
            <button className="btn sm" type="button" id="payDone" onClick={completePay} disabled={!payUtr.trim()}>Payment Complete</button>
          </div>
        </div>
      </div>
      <button className="scrim" id="verifyScrim" hidden aria-hidden="true" tabIndex={-1} onClick={closeVerify} />
      <div className="dlg center" id="verifyDlg" role="dialog" aria-modal="true" aria-labelledby="verifySub" hidden={!verifyOpen}>
        <div className="dlg-box verify-box">
          {verifyStatus === "verifying" && (
            <>
              <div className="verify-spinner"><span className="spinner-dots"><span className="dot"></span><span className="dot"></span><span className="dot"></span></span></div>
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
      </div>

      <div className="typingbar" id="typingBar" hidden={!typing}>
        <span className="spinner-dots" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span></span>
        <span id="typingWho">{Store.typingName() + " is typing…"}</span>
      </div>

      <form className="composer" id="composer" autoComplete="off" onSubmit={submit}>
        <div className="ctx" id="ctxReply" hidden={!replyTo}>
          <span className="k">Reply to <b id="replyWho">{orig ? (orig.from === "me" ? "yourself" : user.name) : "—"}</b></span>
          <span className="muted" id="replyText" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orig ? snippet(orig.text) : "message deleted"}</span>
          <span className="x"><button className="cx" type="button" id="replyCancel" aria-label="Cancel reply" onClick={function () { setReplyTo(null); }}>
            <IcoClose sw={2.4} />
          </button></span>
        </div>

        <div className="ctx edit" id="ctxEdit" hidden={!editingId}>
          <span className="k">Editing message</span>
          <span className="x" style={{ marginLeft: "auto" }}><button className="cx" type="button" id="editCancel" aria-label="Cancel edit" onClick={function () { setEditingId(null); setRaw(""); }}>
            <IcoClose sw={2.4} />
          </button></span>
        </div>

        <div className={"emoji" + (emojiOpen ? " open" : "")} id="emojiRow" role="group" aria-label="Quick emoji">
          {EMOJI.map(function (e) {
            return <button type="button" key={e} aria-label={"Insert " + e} onClick={function () { setRaw(raw + e); if (area.current) area.current.focus({ preventScroll: true }); }}>{e}</button>;
          })}
        </div>

        <div className="crow">
          <button className="icon-btn" type="button" id="emojiBtn" aria-label="Insert emoji" aria-expanded={String(emojiOpen)} onClick={function () { setEmojiOpen(!emojiOpen); }}>
            <IcoEmoji />
          </button>
          <textarea id="input" ref={area} rows="1" placeholder="Message" aria-label="Message" enterKeyHint="send" autoCapitalize="sentences" value={raw} onChange={function (e) { setRaw(e.target.value); }} onKeyDown={keydown} />
          <button className="send" type="submit" id="sendBtn" disabled={sendDisabled} aria-label="Send message"><IcoSend /></button>
        </div>

        <div className="chelp">
          <span id="hint">{hint}</span>
          <span id="counter" hidden={len < 3000}>{len + "/4000"}</span>
        </div>
      </form>
    </Chrome>
  );
}
