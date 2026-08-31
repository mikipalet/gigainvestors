import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { redis } from "@/lib/newsletter/redis";
import { signToken } from "@/lib/newsletter/token";

export const dynamic = "force-dynamic";

const bodySchema = z.union([
  z.object({ url: z.string().url().max(500) }),
  z.object({ email: z.string().trim().toLowerCase().email().max(200) }),
]);

// Resend's one-click link carries a signed token whose payload names the contact and the
// audience. The contact id is an opaque UUID that only reaches the person who got the letter,
// so holding it is the proof of identity; we finish the unsubscribe ourselves rather than
// handing the reader to another site. Resend's own page is a POST form, so it cannot be
// completed server-side.
function contactFromUnsubscribeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !(url.hostname === "resend.com" || url.hostname.endsWith(".resend.com"))) return null;
    const token = url.searchParams.get("token");
    const body = token?.split(".")[1];
    if (!body) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as { contactId?: string; audienceId?: string; exp?: number };
    if (payload.audienceId !== process.env.RESEND_AUDIENCE_ID) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return /^[0-9a-f-]{36}$/i.test(payload.contactId ?? "") ? payload.contactId! : null;
  } catch {
    return null;
  }
}

// Knowing an address must not be enough to unsubscribe it, so this only ever sends a signed
// confirmation link. The one-click path lives in the email itself, where Resend's own token
// already proves who the reader is.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "That doesn't look like an email." }, { status: 400 });

  // One click from the letter: Resend's token already identifies the reader, so complete it
  // here and let them stay on our page.
  if ("url" in parsed.data) {
    const id = contactFromUnsubscribeUrl(parsed.data.url);
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!id || !audienceId) return NextResponse.json({ ok: false }, { status: 400 });
    const res = await new Resend(process.env.RESEND_API_KEY).contacts.update({ audienceId, id, unsubscribed: true }).catch(() => null);
    return NextResponse.json({ ok: Boolean(res?.data) }, { status: res?.data ? 200 : 502 });
  }
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
