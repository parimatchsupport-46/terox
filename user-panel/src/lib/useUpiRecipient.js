import { useEffect, useState } from "react";
import { db, doc, onSnapshot } from "./firebase.js";
import { validUpi } from "./upi.js";

/* Only launch payments to a fresh, server-confirmed admin UPI ID. */
export default function useUpiRecipient() {
  const [recipient, setRecipient] = useState({ upi: "", status: "loading" });
  useEffect(function () {
    return onSnapshot(doc(db, "data", "terox.upi.v1"), { includeMetadataChanges: true }, function (snap) {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.metadata.fromCache) { setRecipient({ upi: "", status: "offline" }); return; }
      const value = snap.exists() && typeof snap.data().value === "string" ? snap.data().value.trim() : "";
      setRecipient(validUpi(value) ? { upi: value, status: "ready" } : { upi: "", status: "missing" });
    }, function () { setRecipient({ upi: "", status: "error" }); });
  }, []);
  return recipient;
}
