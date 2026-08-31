import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { redis } from "@/lib/newsletter/redis";
import { signToken } from "@/lib/newsletter/token";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), hp: z.string().max(0).optional() });

const ok = () => NextResponse.json({ ok: true, message: "Check your inbox to confirm." });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "That doesn't look like an email." }, { status: 400 });
  const { email } = parsed.data;

  try {
    const r = await redis();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = `rl:subscribe:${ip}`;
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, 3600);
    if (n > 5) return NextResponse.json({ ok: false, message: "Too many attempts, try again later." }, { status: 429 });
  } catch {
    // Rate limiting is best effort; never block a subscriber because Redis blinked.
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const secret = process.env.CRON_SECRET;
  if (!audienceId || !secret) return ok();

  try {
    await resend.contacts.create({ audienceId, email, unsubscribed: true });
  } catch {
    // Existing contact: fall through and resend the confirmation.
  }
  const token = signToken(email, secret);
  const confirmUrl = `https://gigainvestors.com/api/confirm?t=${encodeURIComponent(token)}`;
  await resend.emails
    .send({
      from: "GigaInvestors <letters@gigainvestors.com>",
      replyTo: "hello@gigainvestors.com",
      to: email,
      subject: "Confirm: the quarter, by email",
      text: `One click to confirm your subscription to GigaInvestors, one email per quarter:\n\n${confirmUrl}\n\nIf you didn't ask for this, ignore it.`,
      html: `<div style="font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f4f2ec;color:#111;padding:40px 24px"><p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.5;margin:0 0 12px">GigaInvestors</p><p style="font-size:18px;font-weight:600;margin:0 0 16px">One email per quarter: what 83 famous investors just did.</p><p><a href="${confirmUrl}" style="display:inline-block;background:#111;color:#f4f2ec;padding:10px 16px;border-radius:3px;font-weight:600;text-decoration:none">Confirm subscription</a></p><p style="font-size:12px;opacity:.5;margin-top:24px">If you didn't ask for this, ignore it. The link expires in 48 hours.</p></div>`,
    })
    .catch(() => null);
  return ok();
}
