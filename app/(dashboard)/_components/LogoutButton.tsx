"use client";
import { logout } from "@/lib/api-client";

export function LogoutButton() {
  return <button className="btn ghost" onClick={logout}>Uitloggen</button>;
}
