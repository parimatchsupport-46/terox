import { upiPaymentUri } from "./upi.js";

const KEY = "terox.payment.session.v1";
const VALIDITY = 15 * 60 * 1000;

export function makePaymentSession(uid, upi, pick, now = Date.now()) {
  if (!uid || !pick || !upiPaymentUri(upi, pick.amount)) return null;
  return {
    uid, upi: upi.trim(), amount: String(pick.amount),
    service: pick.mode || pick.svc || "", plan: pick.d || "", mode: pick.mode || "",
    startedAt: now, expiresAt: now + VALIDITY
  };
}
export function validPaymentSession(session, uid, now = Date.now()) {
  return !!session && session.uid === uid && Number.isFinite(session.expiresAt) && session.expiresAt > now && !!upiPaymentUri(session.upi, session.amount);
}
export function savePaymentSession(session) {
  try { sessionStorage.setItem(KEY, JSON.stringify(session)); return true; } catch (e) { return false; }
}
export function readPaymentSession(uid) {
  try {
    const session = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return validPaymentSession(session, uid) ? session : null;
  } catch (e) { return null; }
}
export function clearPaymentSession(uid) {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (value && value.uid === uid) sessionStorage.removeItem(KEY);
  } catch (e) { /* Storage may be unavailable. */ }
}
