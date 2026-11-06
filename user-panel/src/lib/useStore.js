/* ==========================================================================
   useStore.js — Store is still the single source of truth: a plain localStorage
   module that shouts "terox:change" whenever it writes. Screens read Store
   directly while rendering and subscribe here, so no state is duplicated.
   ========================================================================== */
import { useEffect, useReducer } from "react";

export default function useStore() {
  const [, bump] = useReducer((n) => n + 1, 0);
  useEffect(function () {
    window.addEventListener("terox:change", bump);
    document.addEventListener("terox:accounts", bump);
    window.addEventListener("terox:theme", bump);
    return function () {
      window.removeEventListener("terox:change", bump);
      document.removeEventListener("terox:accounts", bump);
      window.removeEventListener("terox:theme", bump);
    };
  }, []);
  return bump;
}
