import test from "node:test";
import assert from "node:assert/strict";
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
globalThis.window = { dispatchEvent() {} };
if (!globalThis.CustomEvent) globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
const {default: Store} = await import("../src/lib/store.js");

test("accepted payment replaces only its chat, once per request", () => {
  values.clear();
  const before = {meera:{messages:[{id:"old", from:"me", text:"old", at:1}],unread:2}, other:{messages:[{id:"other",at:2}],unread:0}};
  localStorage.setItem("terox.chats.v1", JSON.stringify(before));
  assert.equal(Store.acknowledgePayment("meera", "request-1"), true);
  const after = Store.chats();
  assert.equal(after.meera.messages.length, 1);
  assert.match(after.meera.messages[0].text, /call request within 1–2 minutes/i);
  assert.equal(after.meera.messages[0].paymentRequestId, "request-1");
  assert.deepEqual(after.other, before.other);
  assert.equal(Store.acknowledgePayment("meera", "request-1"), false);
  assert.equal(Store.thread("meera").messages.length, 1);
});
