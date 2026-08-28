import crypto from "crypto";

const COOKIE_NAME = "flowsys_session";

function expectedToken() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return crypto.createHmac("sha256", secret).update("flowsys-team-session").digest("hex");
}

export function isValidSessionToken(token: string | undefined | null) {
  if (!token) return false;
  const expected = expectedToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function makeSessionToken() {
  return expectedToken();
}

export { COOKIE_NAME };
