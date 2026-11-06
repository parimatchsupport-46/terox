/* Construct the UPI intent locally; no payment data is sent to a QR service. */
export function validUpi(value) {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,255}@[a-zA-Z0-9][a-zA-Z0-9.-]{0,63}$/.test(value.trim());
}

export function upiPaymentUri(upi, amount) {
  if (!validUpi(upi)) return "";
  const number = Number(String(amount || "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return "";
  const params = new URLSearchParams({ pa: upi.trim(), pn: "UPI Payment", am: number.toFixed(2), cu: "INR" });
  return "upi://pay?" + params.toString();
}
