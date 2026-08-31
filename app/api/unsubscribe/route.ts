import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { redis } from "@/lib/newsletter/redis";
import { signToken } from "@/lib/newsletter/token";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

// Knowing an address must not be enough to unsubscribe it, so this only ever sends a signed
// confirmation link. The one-click path lives in the email itself, where Resend's own token
// already proves who the reader is.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "That doesn't look like an email." }, { status: 400 });
  const { email } = parsed.data;

  try {
    const r = await redis();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = `rl:unsubscribe:${ip}`;
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, 3600);
    if (n > 10) return NextResponse.json({ ok: true });
  } catch {
    // Rate limiting is best effort; never block someone from leaving.
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = `https://gigainvestors.com/api/confirm-unsubscribe?t=${encodeURIComponent(signToken(email, secret))}`;
    await new Resend(process.env.RESEND_API_KEY)
      .emails.send({
        from: "GigaInvestors <letters@gigainvestors.com>",
        to: email,
        subject: "Confirm: stop the quarterly letter",
        text: `One click and the quarterly letter stops:\n\n${url}\n\nIf you did not ask for this, ignore it and nothing changes. The link works for 48 hours.`,
      })
      .catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
