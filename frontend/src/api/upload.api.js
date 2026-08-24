import { BASE, authHeaders, handle } from "./client";

export async function uploadDocument(caseId, file) {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${BASE}/cases/${caseId}/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  return handle(r);
}
