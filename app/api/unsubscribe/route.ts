import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { redis } from "@/lib/newsletter/redis";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

// Always answers ok: whether an address is on the list is not something a stranger gets to learn.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });
  const { email } = parsed.data;

  try {
    const r = await redis();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = `rl:unsubscribe:${ip}`;
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, 3600);
    if (n > 20) return NextResponse.json({ ok: true });
  } catch {
    // Rate limiting is best effort; never block someone from leaving.
  }

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (audienceId) await new Resend(process.env.RESEND_API_KEY).contacts.update({ audienceId, email, unsubscribed: true }).catch(() => null);
  return NextResponse.json({ ok: true });
}
