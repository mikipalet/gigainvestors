import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { verifySvix } from "@/lib/newsletter/webhook";
import { isColdOutreach } from "@/lib/inbound/is-cold-outreach";

export const dynamic = "force-dynamic";

interface ReceivedEvent {
  type: string;
  data: { email_id: string };
}

const bare = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from.trim();

// Mail sent to any address on the domain lands here and is forwarded on, so hello@gigainvestors.com
// works as a real inbox without one existing. Replies go straight back to the sender.
export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!verifySvix(req.headers, body, process.env.RESEND_INBOUND_SECRET)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const to = process.env.CONTACT_FORWARD_TO;
  if (!to) return NextResponse.json({ ok: true, forwarded: false });

  const event = JSON.parse(body) as ReceivedEvent;
  if (event.type !== "email.received") return NextResponse.json({ ok: true });

  // The event carries only metadata; the body lives behind the Receiving API.
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: mail, error } = await resend.emails.receiving.get(event.data.email_id);
  if (error || !mail) return NextResponse.json({ error: error?.message ?? "email not found" }, { status: 502 });

  const sender = mail.from || "unknown";
  const sentTo = mail.to.join(", ");
  if (await isColdOutreach({ from: sender, subject: mail.subject, text: mail.text ?? mail.html ?? "" })) {
    return NextResponse.json({ ok: true, forwarded: false, reason: "cold-outreach" });
  }
  const header = `From: ${sender}\nTo: ${sentTo}\n\n`;

  await resend.emails.send({
    from: "GigaInvestors <hello@gigainvestors.com>",
    to,
    ...(bare(sender).includes("@") ? { replyTo: bare(sender) } : {}),
    subject: mail.subject ? `[gigainvestors] ${mail.subject}` : "[gigainvestors] (no subject)",
    text: header + (mail.text ?? "(no text part)"),
    ...(mail.html ? { html: `<p style="font:13px/1.5 system-ui;color:#666">From: ${sender}<br>To: ${sentTo}</p><hr>${mail.html}` } : {}),
  });
  return NextResponse.json({ ok: true, forwarded: true });
}
