import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { verifySvix } from "@/lib/newsletter/webhook";

export const dynamic = "force-dynamic";

interface InboundEmail {
  from?: string | { address?: string; name?: string };
  to?: string[] | string;
  subject?: string;
  text?: string;
  html?: string;
}

const address = (from: InboundEmail["from"]): string => (typeof from === "string" ? from : (from?.address ?? ""));
const bare = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from.trim();

// Mail sent to any address on the domain lands here and is forwarded on, so hello@gigainvestors.com
// works as a real inbox without one existing. Replies go straight back to the sender.
export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!verifySvix(req.headers, body, process.env.RESEND_INBOUND_SECRET)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const to = process.env.CONTACT_FORWARD_TO;
  if (!to) return NextResponse.json({ ok: true, forwarded: false });

  const event = JSON.parse(body) as { type: string; data: InboundEmail };
  if (event.type !== "email.received") return NextResponse.json({ ok: true });
  const mail = event.data;
  const sender = address(mail.from);
  const sentTo = (Array.isArray(mail.to) ? mail.to.join(", ") : mail.to) ?? "";
  const header = `From: ${sender || "unknown"}\nTo: ${sentTo}\n\n`;

  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "GigaInvestors <hello@gigainvestors.com>",
    to,
    ...(bare(sender).includes("@") ? { replyTo: bare(sender) } : {}),
    subject: mail.subject ? `[gigainvestors] ${mail.subject}` : "[gigainvestors] (no subject)",
    text: header + (mail.text ?? "(no text part)"),
    ...(mail.html ? { html: `<p style="font:13px/1.5 system-ui;color:#666">From: ${sender}<br>To: ${sentTo}</p><hr>${mail.html}` } : {}),
  });
  return NextResponse.json({ ok: true, forwarded: true });
}
