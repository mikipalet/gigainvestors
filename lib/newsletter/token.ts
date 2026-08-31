import { createHmac, timingSafeEqual } from "node:crypto";

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sig = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

// Confirmation link token: email + issued-at, HMAC-signed. Verified with a max age in ms.
export function signToken(email: string, secret: string, issuedAt = Date.now()): string {
  const payload = `${b64(email.toLowerCase())}.${issuedAt}`;
  return `${payload}.${sig(payload, secret)}`;
}

export function verifyToken(token: string, secret: string, maxAgeMs: number, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [e, ts, s] = parts;
  const payload = `${e}.${ts}`;
  const expected = sig(payload, secret);
  if (s.length !== expected.length || !timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  if (now - Number(ts) > maxAgeMs) return null;
  return Buffer.from(e, "base64url").toString();
}
