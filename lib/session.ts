// Uses the Web Crypto API (globalThis.crypto.subtle) instead of Node's
// "crypto" module: this file is imported from middleware.ts, which runs on
// the Edge Runtime and does not support Node's crypto module.

import type { NextRequest } from "next/server";

const COOKIE_NAME = "flowsys_session";

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeSessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return hmacHex(secret, "flowsys-team-session");
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await makeSessionToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// Tweede, additionele cookie bovenop flowsys_session: legt vast WIE er is
// ingelogd (los van de gedeelde teamcode), zodat toewijzing/doorsturen van
// taken niet langer op een vrij te kiezen, ongeverifieerde naam vertrouwt.
const IDENTITY_COOKIE_NAME = "flowsys_identity";

export async function makeIdentityToken(crewId: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const sig = await hmacHex(secret, `flowsys-identity:${crewId}`);
  return `${crewId}.${sig}`;
}

export async function verifyIdentityToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const crewId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const expected = await hmacHex(secret, `flowsys-identity:${crewId}`);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? crewId : null;
}

// Gemakshelper voor Route Handlers -- Server Components lezen de cookie zelf
// via next/headers cookies() en roepen verifyIdentityToken direct aan.
export async function getIdentity(req: NextRequest): Promise<string | null> {
  return verifyIdentityToken(req.cookies.get(IDENTITY_COOKIE_NAME)?.value);
}

export { COOKIE_NAME, IDENTITY_COOKIE_NAME };
