import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { verifyToken } from "@/lib/newsletter/token";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  const email = verifyToken(token, secret, 48 * 3600 * 1000);
  const back = (state: string) => NextResponse.redirect(new URL(`/newsletter?${state}`, "https://gigainvestors.com"));
  if (!email) return back("error=link");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) return back("error=config");
  try {
    await resend.contacts.update({ audienceId, email, unsubscribed: false });
  } catch {
    await resend.contacts.create({ audienceId, email, unsubscribed: false }).catch(() => null);
  }
  return back("confirmed=1");
}
