import test from "node:test";
import assert from "node:assert/strict";
import { validUpi, upiPaymentUri } from "../src/lib/upi.js";

test("UPI payment QR payload includes the configured ID and chosen INR amount", () => {
  const uri = new URL(upiPaymentUri("shop@bank", "₹1,000"));
  assert.equal(uri.protocol, "upi:");
  assert.equal(uri.host, "pay");
  assert.equal(uri.searchParams.get("pa"), "shop@bank");
  assert.equal(uri.searchParams.get("am"), "1000.00");
  assert.equal(uri.searchParams.get("cu"), "INR");
});
test("missing ID, malformed ID and missing amount do not produce a QR", () => {
  assert.equal(validUpi("invalid-id"), false);
  assert.equal(upiPaymentUri("invalid-id", "₹200"), "");
  assert.equal(upiPaymentUri("shop@bank", ""), "");
  assert.equal(upiPaymentUri("shop@bank", "₹0"), "");
});
