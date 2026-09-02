import type { Resend } from "resend";

interface InboundAttachment {
  id: string;
  filename: string | null;
  size: number;
  content_type: string;
  content_id: string | null;
  content_disposition: string | null;
}

// Resend caps an outgoing message at 40MB; keep headroom for the body.
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

// Inline images already arrive embedded in the fetched html as data URIs, so only real files are forwarded.
export async function fetchAttachments({ resend, emailId, attachments }: { resend: Resend; emailId: string; attachments: InboundAttachment[] }) {
  const files = attachments.filter((a) => !(a.content_disposition === "inline" && a.content_id));
  const forwarded: { filename: string; content: string; contentType: string }[] = [];
  const skipped: string[] = [];
  let total = 0;
  for (const file of files) {
    const name = file.filename ?? file.id;
    if (total + file.size > MAX_TOTAL_BYTES) {
      skipped.push(name);
      continue;
    }
    const { data } = await resend.emails.receiving.attachments.get({ emailId, id: file.id });
    const res = data ? await fetch(data.download_url) : null;
    if (!res?.ok) {
      skipped.push(name);
      continue;
    }
    forwarded.push({ filename: name, content: Buffer.from(await res.arrayBuffer()).toString("base64"), contentType: file.content_type });
    total += file.size;
  }
  return { forwarded, skipped };
}
