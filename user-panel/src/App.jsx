/* User-panel routes are available directly, without an account gate. */
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import useStore from "./lib/useStore.js";
import Home from "./pages/Home.jsx";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile.jsx";
import User from "./pages/User.jsx";
import Payment from "./pages/Payment.jsx";

// Preserve old shared/bookmarked login links, but never show a login screen.
function LegacyLoginRedirect() {
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next") || "/";
  const safe = /^\/(?:index|chat|profile|user|pay)(?:\?[^#]*)?$/.test(next) || next === "/";
  return <Navigate to={safe ? next : "/"} replace />;
}

export default function App() {
  useStore();
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname + location.search}>
      <Route path="/login" element={<LegacyLoginRedirect />} />
      <Route path="/" element={<Home />} />
      <Route path="/index" element={<Home />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/user" element={<User />} />
      <Route path="/pay" element={<Payment />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
