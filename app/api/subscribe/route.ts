import { NextResponse, type NextRequest } from "next/server";
import { render } from "@react-email/render";
import React from "react";
import { Resend } from "resend";
import { z } from "zod";
import { redis } from "@/lib/newsletter/redis";
import { signToken } from "@/lib/newsletter/token";
import { ConfirmEmail } from "@/emails/ConfirmEmail";

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
      subject: "Confirm your GigaInvestors subscription",
      text: `One click to confirm, then one letter a quarter on what 83 of the most followed investors bought and sold.\n\n${confirmUrl}\n\nThe link works for 48 hours. If you did not ask for this, ignore it.`,
      html: await render(React.createElement(ConfirmEmail, { confirmUrl })),
    })
    .catch(() => null);
  return ok();
}
