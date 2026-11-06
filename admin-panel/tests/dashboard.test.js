import test from "node:test";
import assert from "node:assert/strict";
import { dashboardCounts } from "../src/lib/dashboard.js";

test("reset hides old activity without modifying chats, users or payments", () => {
  const users = [{id:"a"}, {id:"b"}];
  const chats = {a: {messages:[{at:100}]}};
  const requests = [{uid:"a", status:"pending", at:110}];
  const snapshot = JSON.stringify({users, chats, requests});
  const stats = dashboardCounts(users, chats, requests, 200);
  assert.deepEqual(stats, {total:0, chatted:0, noChat:0, paid:0, noPay:0, pending:0, utrSubmitted:0});
  assert.equal(JSON.stringify({users, chats, requests}), snapshot);
});
test("new chat, new UTR and payment verified after reset are counted", () => {
  const users = [{id:"a"}, {id:"b"}];
  const chats = {a:{messages:[{at:210}]}};
  const requests = [{uid:"a", status:"accepted", at:100, resolvedAt:220}, {uid:"b", status:"pending", at:230}];
  assert.deepEqual(dashboardCounts(users, chats, requests, 200), {total:2,chatted:1,noChat:1,paid:1,noPay:1,pending:1,utrSubmitted:1});
});


test("after reset the report includes only contacts with new activity", () => {
  const users = [{id:"a"}, {id:"b"}, {id:"c"}];
  const chats = {a:{messages:[{at:100}]}, b:{messages:[{at:201}]}};
  const requests = [{uid:"a", status:"pending", at:100}];
  assert.deepEqual(dashboardCounts(users, chats, requests, 200),
    {total:1, chatted:1, noChat:0, paid:0, noPay:1, pending:0, utrSubmitted:0});
});

test("a post-reset decision on an old request counts as new activity", () => {
  const users = [{id:"a"}, {id:"b"}];
  const requests = [{uid:"a", status:"accepted", at:100, resolvedAt:210}];
  assert.deepEqual(dashboardCounts(users, {}, requests, 200),
    {total:1, chatted:0, noChat:1, paid:1, noPay:0, pending:0, utrSubmitted:0});
});

test("without a reset the full roster is included", () => {
  assert.deepEqual(dashboardCounts([{id:"a"},{id:"b"}], {}, [], 0),
    {total:2, chatted:0, noChat:2, paid:0, noPay:2, pending:0, utrSubmitted:0});
});
