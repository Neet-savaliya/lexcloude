import { BASE, extractError } from "./client";

// Note: these intentionally do NOT use the shared `handle()` helper — a 401
// here means "invalid credentials", not "session expired", so it must not
// trigger the logout/redirect flow that `handle()` applies to authenticated routes.

export async function signup(email, password, name) {
  const r = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!r.ok) throw new Error(await extractError(r));
  return r.json();
}

export async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await extractError(r));
  return r.json();
}

export async function forgotPassword(email) {
  const r = await fetch(`${BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(await extractError(r));
  return r.json();
}

export async function resetPassword(token, password) {
  const r = await fetch(`${BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!r.ok) throw new Error(await extractError(r));
  return r.json();
}
