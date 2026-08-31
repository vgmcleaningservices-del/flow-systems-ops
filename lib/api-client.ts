"use client";

export async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) window.alert("Opslaan mislukt — probeer opnieuw.");
  return res.ok;
}

export async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login";
}
