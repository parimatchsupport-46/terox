import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Auth from "../lib/auth.js";
import Store from "../lib/store.js";
import logo from "../assets/logo.png";

export default function InviteNotice() {
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();
  useEffect(function () {
    let index = 0;
    const timer = window.setInterval(function () {
      if (!Auth.peek()) return;
      const roster = Store.users();
      if (!roster.length) return;
      const user = roster[index % roster.length];
      index++;
      setNotice({ id: user.id, name: user.name, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) });
    }, 120000);
    return function () { window.clearInterval(timer); };
  }, []);
  useEffect(function () {
    if (!notice) return undefined;
    const timer = window.setTimeout(function () { setNotice(null); }, 8000);
    return function () { window.clearTimeout(timer); };
  }, [notice]);
  return (
    <div className="invite-region" aria-live="polite">
      {notice && <div className="invite-notice">
        <button className="invite-main" type="button" onClick={function () { setNotice(null); navigate("/chat?u=" + encodeURIComponent(notice.id)); }}>
          <img src={logo} alt="" width="40" height="40" />
          <span className="invite-content"><span className="invite-heading"><strong>Terox Chat</strong><time>{notice.time}</time></span><span>{notice.name} invited you to chat</span></span>
        </button>
        <button className="invite-close" type="button" aria-label="Dismiss notification" onClick={function () { setNotice(null); }}>×</button>
      </div>}
    </div>
  );
}
