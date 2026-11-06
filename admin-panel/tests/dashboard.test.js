import test from "node:test";
import assert from "node:assert/strict";
import { dashboardCounts } from "../src/lib/dashboard.js";

test("reset hides old activity without modifying chats, users or payments", () => {
  const users = [{id:"a"}, {id:"b"}];
  const chats = {a: {messages:[{at:100}]}};
  const requests = [{uid:"a", status:"pending", at:110}];
  const snapshot = JSON.stringify({users, chats, requests});
  const stats = dashboardCounts(users, chats, requests, 200);
  assert.deepEqual(stats, {total:2, chatted:0, noChat:2, paid:0, noPay:2, pending:0, utrSubmitted:0});
  assert.equal(JSON.stringify({users, chats, requests}), snapshot);
});
test("new chat, new UTR and payment verified after reset are counted", () => {
  const users = [{id:"a"}, {id:"b"}];
  const chats = {a:{messages:[{at:210}]}};
  const requests = [{uid:"a", status:"accepted", at:100, resolvedAt:220}, {uid:"b", status:"pending", at:230}];
  assert.deepEqual(dashboardCounts(users, chats, requests, 200), {total:2,chatted:1,noChat:1,paid:1,noPay:1,pending:1,utrSubmitted:1});
});
