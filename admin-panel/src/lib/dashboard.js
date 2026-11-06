/* Dashboard reset affects reporting only. Actual chats and payments remain intact. */
export function dashboardCounts(users, chats, requests, resetAt) {
  const cutoff = Number(resetAt) || 0;
  const after = value => Number(value) > cutoff;
  const recentRequests = requests.filter(r => after(r.at));
  const paid = new Set(requests.filter(r => r.status === "accepted" && after(r.resolvedAt || r.at)).map(r => r.uid));
  const submitted = new Set(recentRequests.filter(r => r.status === "pending" || r.status === "accepted").map(r => r.uid));
  const chatted = users.filter(u => ((chats[u.id] || {}).messages || []).some(m => after(m.at))).length;
  const paidUsers = users.filter(u => paid.has(u.id)).length;
  const total = users.length;
  return {
    total, chatted, noChat: total - chatted, paid: paidUsers, noPay: total - paidUsers,
    pending: recentRequests.filter(r => r.status === "pending").length,
    utrSubmitted: users.filter(u => submitted.has(u.id)).length
  };
}
