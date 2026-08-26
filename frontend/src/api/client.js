export const BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";
const TOKEN_KEY = "lexcloud_token";

export function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function extractError(r) {
  try {
    const body = await r.json();
    return body.error || `Request failed (${r.status})`;
  } catch {
    return `Request failed (${r.status})`;
  }
}

export async function handle(r) {
  if (r.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("lexcloud_lawyer");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!r.ok) throw new Error(await extractError(r));
  return r.json();
}
