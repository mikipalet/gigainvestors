import { createHmac, timingSafeEqual } from "node:crypto";

// Resend signs webhooks the Svix way: HMAC-SHA256 over `${id}.${timestamp}.${body}`.
// Each webhook endpoint has its OWN secret, so the caller passes the one it registered with.
export function verifySvix(headers: Headers, body: string, secret: string | undefined): boolean {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sigs.split(" ").some((s) => {
    const [, v] = s.split(",");
    if (!v) return false;
    const given = Buffer.from(v, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
