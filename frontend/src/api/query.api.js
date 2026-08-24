import { BASE, authHeaders, handle } from "./client";

export async function queryCase(caseId, question) {
  const r = await fetch(`${BASE}/cases/${caseId}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question }),
  });
  return handle(r);
}

export async function listMessages(caseId) {
  const r = await fetch(`${BASE}/cases/${caseId}/messages`, { headers: authHeaders() });
  return handle(r);
}
