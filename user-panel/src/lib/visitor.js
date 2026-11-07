/* Local-only identity for keeping payment verification tied to this browser.
   It is not a login, account, or security boundary. */
const KEY = "terox.visitor.v1";
let inMemoryId = null;

export function visitorId() {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;

    // Preserve an in-progress verification from the previously signed-in user.
    let id = null;
    try {
      const session = JSON.parse(localStorage.getItem("terox.session.v1") || "null");
      const accounts = JSON.parse(localStorage.getItem("terox.accounts.v1") || "[]");
      if (typeof session === "string" && Array.isArray(accounts) && accounts.some(a => a && a.id === session)) id = session;
    } catch (e) { /* A malformed legacy session is simply ignored. */ }
    id ||= "visitor-" + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
    localStorage.setItem(KEY, id);
    return id;
  } catch (e) {
    // Verification itself reports a storage error if localStorage is blocked.
    return inMemoryId ||= "visitor-" + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
  }
}
