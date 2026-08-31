import { NextResponse, type NextRequest } from "next/server";
import { render } from "@react-email/render";
import React from "react";
import { Resend } from "resend";
import { z } from "zod";
import { mailBuckets, withinLimit } from "@/lib/newsletter/limit";
import { signToken } from "@/lib/newsletter/token";
import { ConfirmEmail } from "@/emails/ConfirmEmail";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), hp: z.string().max(0).optional() });

const ok = () => NextResponse.json({ ok: true, message: "Check your inbox to confirm." });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "That doesn't look like an email." }, { status: 400 });
  const { email } = parsed.data;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await withinLimit(mailBuckets("subscribe", ip, email)))) return ok();

  const resend = new Resend(process.env.RESEND_API_KEY);
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const secret = process.env.CRON_SECRET;
  if (!audienceId || !secret) return ok();

  // contacts.create UPSERTS, so creating over a confirmed contact would silently unsubscribe them:
  // anyone could unsubscribe a subscriber by typing their address into the form. Only create when
  // the address is new; either way the same confirmation goes out, so the form never reveals who
  // is already subscribed.
  const existing = await resend.contacts.get({ audienceId, email }).catch(() => null);
  if (!existing?.data) await resend.contacts.create({ audienceId, email, unsubscribed: true }).catch(() => null);
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
