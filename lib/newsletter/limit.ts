import { redis } from "./redis";

// Both mail-sending routes are, by design, "give me an address and I will email it". Without a
// ceiling that is an open relay: someone can bomb a stranger from our domain and burn the daily
// sending quota so the real quarterly letter cannot go out. Limits are checked per IP, per
// address, and across the whole site.
export async function withinLimit(buckets: { key: string; max: number; windowSeconds: number }[]): Promise<boolean> {
  try {
    const r = await redis();
    for (const b of buckets) {
      const n = await r.incr(b.key);
      if (n === 1) await r.expire(b.key, b.windowSeconds);
      if (n > b.max) return false;
    }
    return true;
  } catch {
    // Redis is down: let the request through rather than break subscribing, since the daily
    // Resend quota is still a hard backstop.
    return true;
  }
}

const DAY = 24 * 3600;

export const mailBuckets = (action: string, ip: string, email: string) => [
  { key: `rl:${action}:ip:${ip}`, max: 5, windowSeconds: 3600 },
  { key: `rl:${action}:to:${email}`, max: 3, windowSeconds: DAY },
  { key: `rl:mail:all:${new Date().toISOString().slice(0, 10)}`, max: 60, windowSeconds: DAY },
];
