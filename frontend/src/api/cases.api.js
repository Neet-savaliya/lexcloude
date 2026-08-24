import { BASE, authHeaders, handle } from "./client";

export async function listCases() {
  const r = await fetch(`${BASE}/cases`, { headers: { ...authHeaders() } });
  return handle(r);
}

export async function createCase(caseName, clientName) {
  const r = await fetch(`${BASE}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ caseName, clientName }),
  });
  return handle(r);
}

export async function getCase(caseId) {
  const r = await fetch(`${BASE}/cases/${caseId}`, { headers: { ...authHeaders() } });
  return handle(r);
}

export async function updateCase(caseId, { caseName, clientName }) {
  const r = await fetch(`${BASE}/cases/${caseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ caseName, clientName }),
  });
  return handle(r);
}

export async function deleteCase(caseId) {
  const r = await fetch(`${BASE}/cases/${caseId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(r);
}

export async function listDocuments(caseId) {
  const r = await fetch(`${BASE}/cases/${caseId}/documents`, { headers: { ...authHeaders() } });
  return handle(r);
}

export async function deleteDocument(caseId, docId) {
  const r = await fetch(`${BASE}/cases/${caseId}/documents/${docId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handle(r);
}
