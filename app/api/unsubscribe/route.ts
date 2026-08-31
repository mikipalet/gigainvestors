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

// Only ever fetched to complete a one-click the reader started, and only on Resend's own host.
const isResendUrl = (raw: string) => {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && (u.hostname === "resend.com" || u.hostname.endsWith(".resend.com"));
  } catch {
    return false;
  }
};

// Knowing an address must not be enough to unsubscribe it, so this only ever sends a signed
// confirmation link. The one-click path lives in the email itself, where Resend's own token
// already proves who the reader is.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "That doesn't look like an email." }, { status: 400 });

  // One click from the letter: Resend's token already identifies the reader, so complete it
  // here and let them stay on our page.
  if ("url" in parsed.data) {
    if (!isResendUrl(parsed.data.url)) return NextResponse.json({ ok: false }, { status: 400 });
    const res = await fetch(parsed.data.url, { redirect: "follow", cache: "no-store" }).catch(() => null);
    return NextResponse.json({ ok: Boolean(res?.ok) }, { status: res?.ok ? 200 : 502 });
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
