import test from "node:test";
import assert from "node:assert/strict";
import { beginVerification, readVerification, finishVerification } from "../src/lib/verificationSession.js";
const data = new Map();
globalThis.localStorage = {getItem:k=>data.get(k) ?? null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};

test("only the submitting account and selected chat can restore verification", () => {
  data.clear();
  assert.equal(beginVerification("account-a", "meera", "request-1"), true);
  assert.equal(readVerification("account-a", "meera"), "request-1");
  assert.equal(readVerification("account-b", "meera"), null);
  assert.equal(readVerification("account-a", "another-user"), null);
  finishVerification("account-a", "meera", "wrong-request");
  assert.equal(readVerification("account-a", "meera"), "request-1");
  finishVerification("account-a", "meera", "request-1");
  assert.equal(readVerification("account-a", "meera"), null);
});
test("verification cannot start without an account, chat and request", () => {
  assert.equal(beginVerification(null, "meera", "request"), false);
  assert.equal(beginVerification("account-a", "", "request"), false);
  assert.equal(beginVerification("account-a", "meera", ""), false);
});
