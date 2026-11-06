/* Dashboard reset starts a new reporting period without deleting source data. */
export function dashboardCounts(users, chats, requests, resetAt) {
  const cutoff = Number(resetAt) || 0;
  const after = value => Number(value) > cutoff;
  const recentRequests = requests.filter(r => after(r.at));
  const resolvedRequests = requests.filter(r => after(r.resolvedAt));
  const active = new Set([...recentRequests, ...resolvedRequests].map(r => r.uid));
  users.forEach(u => {
    if (((chats[u.id] || {}).messages || []).some(m => after(m.at))) active.add(u.id);
  });
  // After a reset, all cards describe contacts with activity in the new period.
  // The complete roster remains unchanged in the Users tab.
  const reportUsers = cutoff ? users.filter(u => active.has(u.id)) : users;
  const paid = new Set(requests.filter(r => r.status === "accepted" && after(r.resolvedAt || r.at)).map(r => r.uid));
  const submitted = new Set(recentRequests.filter(r => r.status === "pending" || r.status === "accepted").map(r => r.uid));
  const chatted = reportUsers.filter(u => ((chats[u.id] || {}).messages || []).some(m => after(m.at))).length;
  const paidUsers = reportUsers.filter(u => paid.has(u.id)).length;
  const total = reportUsers.length;
  return {
    total, chatted, noChat: total - chatted, paid: paidUsers, noPay: total - paidUsers,
    pending: recentRequests.filter(r => r.status === "pending").length,
    utrSubmitted: reportUsers.filter(u => submitted.has(u.id)).length
  };
}
