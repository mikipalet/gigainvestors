import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { verifyToken } from "@/lib/newsletter/token";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const secret = process.env.CRON_SECRET;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const email = secret ? verifyToken(token, secret, 48 * 3600e3) : null;
  if (!email || !audienceId) return NextResponse.redirect(new URL("/unsubscribe?error=link", req.url));
  await new Resend(process.env.RESEND_API_KEY).contacts.update({ audienceId, email, unsubscribed: true }).catch(() => null);
  return NextResponse.redirect(new URL("/unsubscribe?done=1", req.url));
}
