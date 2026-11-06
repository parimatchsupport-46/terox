/* ==========================================================================
   App.jsx — admin panel router. Only the admin route.
   ========================================================================== */
import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./lib/auth.js";
import useStore from "./lib/useStore.js";
import Admin from "./pages/Admin.jsx";

function Guard({ children }) {
  if (!Auth.peek()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  useStore();
  return (
    <Routes>
      <Route path="/login" element={<Admin />} />
      <Route path="*" element={<Guard><Admin /></Guard>} />
    </Routes>
  );
}
