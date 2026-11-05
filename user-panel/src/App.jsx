/* ==========================================================================
   App.jsx — five routes, one gate. Nothing here renders chrome: each screen
   brings the markup it always had.
   ========================================================================== */
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Auth from "./lib/auth.js";
import useStore from "./lib/useStore.js";
import Home from "./pages/Home.jsx";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile.jsx";
import User from "./pages/User.jsx";
import Login from "./pages/Login.jsx";

const APP_ROUTES = /^(\/(index|chat|profile|user))?(\?|$)/;

function nextFrom(search) {
  let next = "";
  try { next = new URLSearchParams(search).get("next") || ""; } catch (e) {}
  return APP_ROUTES.test(next) ? next : "/";
}

function LoginRoute() {
  const loc = useLocation();
  if (Auth.peek()) return <Navigate to={nextFrom(loc.search)} replace />;
  return <Login />;
}

function Guard({ children }) {
  const loc = useLocation();
  if (!Auth.peek()) {
    return <Navigate to={"/login?next=" + encodeURIComponent(loc.pathname + (loc.search || ""))} replace />;
  }
  return children;
}

export default function App() {
  useStore();
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/" element={<Guard><Home /></Guard>} />
      <Route path="/chat" element={<Guard><Chat /></Guard>} />
      <Route path="/profile" element={<Guard><Profile /></Guard>} />
      <Route path="/user" element={<Guard><User /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
