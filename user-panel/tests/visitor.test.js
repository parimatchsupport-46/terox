import test from "node:test";
import assert from "node:assert/strict";
import { visitorId } from "../src/lib/visitor.js";
import { beginVerification, readVerification } from "../src/lib/verificationSession.js";

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
}

test("a new visitor gets a persistent, distinct device identity without an account", () => {
  globalThis.localStorage = storage();
  const id = visitorId();
  assert.match(id, /^visitor-/);
  assert.equal(visitorId(), id);
  assert.equal(beginVerification(id, "a", "req"), true);
  assert.equal(readVerification(visitorId(), "a"), "req");
  globalThis.localStorage = storage();
  assert.notEqual(visitorId(), id);
});

test("previous signed-in session preserves an in-progress verification without changing old data", () => {
  const accounts = JSON.stringify([{id:"old-user",name:"Existing"}]);
  globalThis.localStorage = storage({"terox.accounts.v1": accounts, "terox.session.v1": JSON.stringify("old-user")});
  beginVerification("old-user", "a", "pending-request");
  assert.equal(visitorId(), "old-user");
  assert.equal(readVerification(visitorId(), "a"), "pending-request");
  assert.equal(localStorage.getItem("terox.accounts.v1"), accounts);
  localStorage.removeItem("terox.session.v1");
  assert.equal(visitorId(), "old-user");
});

test("invalid legacy session is not used", () => {
  globalThis.localStorage = storage({"terox.accounts.v1": "[]", "terox.session.v1": JSON.stringify("not-found")});
  assert.match(visitorId(), /^visitor-/);
});
