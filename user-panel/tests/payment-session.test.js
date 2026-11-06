import test from "node:test";
import assert from "node:assert/strict";
import { makePaymentSession, validPaymentSession, savePaymentSession, readPaymentSession, clearPaymentSession } from "../src/lib/paymentSession.js";
const values = new Map();
globalThis.sessionStorage = {setItem:(k,v)=>values.set(k,String(v)),getItem:k=>values.get(k) ?? null,removeItem:k=>values.delete(k)};

test("session freezes selected recipient and amount, and belongs to the intended chat", () => {
  const now = Date.now();
  const pick = {amount:"₹200", mode:"Voice calling", d:"5 min"};
  const session = makePaymentSession("meera", "shop@bank", pick, now);
  pick.amount = "₹900";
  assert.equal(session.amount, "₹200");
  assert.equal(session.upi, "shop@bank");
  assert.equal(validPaymentSession(session, "meera", now), true);
  assert.equal(validPaymentSession(session, "another", now), false);
  assert.equal(validPaymentSession(session, "meera", session.expiresAt), false);
  assert.equal(savePaymentSession(session), true);
  assert.deepEqual(readPaymentSession("meera"), session);
  assert.equal(readPaymentSession("another"), null);
  clearPaymentSession("meera");
  assert.equal(readPaymentSession("meera"), null);
});
test("missing recipient or amount cannot start a payment", () => {
  assert.equal(makePaymentSession("meera", "invalid", {amount:"₹200"}), null);
  assert.equal(makePaymentSession("meera", "shop@bank", {amount:""}), null);
});
