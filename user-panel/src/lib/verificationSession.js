/* Track only payments actually submitted by this signed-in account on this device. */
function key(accountId, uid) {
  return "terox.verification.v1:" + encodeURIComponent(accountId) + ":" + encodeURIComponent(uid);
}
export function beginVerification(accountId, uid, requestId) {
  if (!accountId || !uid || !requestId) return false;
  try { localStorage.setItem(key(accountId, uid), requestId); return true; } catch (e) { return false; }
}
export function readVerification(accountId, uid) {
  if (!accountId || !uid) return null;
  try { return localStorage.getItem(key(accountId, uid)) || null; } catch (e) { return null; }
}
export function finishVerification(accountId, uid, requestId) {
  if (!accountId || !uid || !requestId) return;
  try { if (localStorage.getItem(key(accountId, uid)) === requestId) localStorage.removeItem(key(accountId, uid)); } catch (e) {}
}
