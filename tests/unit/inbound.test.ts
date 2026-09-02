import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const send = vi.fn(async (_payload: unknown) => ({ data: { id: "sent" }, error: null }));
const attachmentGet = vi.fn(async ({ id }: { emailId: string; id: string }) => ({
  data: { id, download_url: `https://files.test/${id}`, expires_at: "2026-09-03T00:00:00Z" },
  error: null,
}));
let attachments: { id: string; filename: string | null; size: number; content_type: string; content_id: string | null; content_disposition: string | null }[] = [];
const get = vi.fn(async () => ({
  data: {
    id: "e1ddc37d",
    attachments,
    from: "Luciana <luc@example.com>",
    to: ["hello@gigainvestors.com"],
    subject: "Growth for gigainvestors.com",
    text: "Hello there,\n\nthe body",
    html: "<p>the body</p>",
  },
  error: null,
}));
vi.mock("resend", () => ({ Resend: class { emails = { send, receiving: { get, attachments: { get: attachmentGet } } }; } }));
vi.mock("@/lib/newsletter/webhook", () => ({ verifySvix: () => true }));

let verdict = "person";
let classifierStatus = 200;
const fakeFetch = vi.fn(async (url: string | URL | Request) => {
  const href = String(url);
  if (href.startsWith("https://files.test/")) return new Response(`bytes-of-${href.split("/").pop()}`);
  const body = JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: verdict }] });
  return new Response(classifierStatus === 200 ? body : "overloaded", { status: classifierStatus });
});

const received = {
  type: "email.received",
  created_at: "2026-09-02T12:35:44.475Z",
  data: { email_id: "e1ddc37d" },
};
const post = (event: unknown) =>
  new NextRequest("http://localhost/api/inbound", { method: "POST", body: JSON.stringify(event) });
const sentPayload = () =>
  send.mock.calls[0]?.[0] as { text: string; html?: string; replyTo?: string; subject: string; attachments?: { filename: string; content: string; contentType: string }[] };

describe("POST /api/inbound", () => {
  beforeEach(() => {
    process.env.CONTACT_FORWARD_TO = "me@example.com";
    process.env.RESEND_API_KEY = "re_test";
    process.env.ANTHROPIC_API_KEY = "sk-test";
    send.mockClear();
    get.mockClear();
    attachmentGet.mockClear();
    attachments = [];
    verdict = "person";
    classifierStatus = 200;
    vi.stubGlobal("fetch", fakeFetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the body by email_id, since the event carries only metadata, and forwards it with the sender as reply-to", async () => {
    const { POST } = await import("@/app/api/inbound/route");
    const res = await POST(post(received));

    expect(res.status).toBe(200);
    expect(get).toHaveBeenCalledWith("e1ddc37d");
    const sent = sentPayload();
    expect(sent.text).toContain("the body");
    expect(sent.text).not.toContain("(no text part)");
    expect(sent.html).toContain("<p>the body</p>");
    expect(sent.replyTo).toBe("luc@example.com");
    expect(sent.subject).toBe("[gigainvestors] Growth for gigainvestors.com");
  });

  it("drops cold outreach instead of forwarding it, but still answers 200 so Resend does not retry", async () => {
    verdict = "pitch";
    const { POST } = await import("@/app/api/inbound/route");
    const res = await POST(post(received));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, forwarded: false, reason: "cold-outreach" });
    expect(send).not.toHaveBeenCalled();
  });

  it("forwards when the classifier is unavailable, because losing a real message is worse than seeing a pitch", async () => {
    classifierStatus = 529;
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("forwards file attachments and skips inline images, which the fetched html already embeds", async () => {
    attachments = [
      { id: "att1", filename: "deck.pdf", size: 1200, content_type: "application/pdf", content_id: null, content_disposition: "attachment" },
      { id: "att2", filename: "logo.png", size: 300, content_type: "image/png", content_id: "logo@mail", content_disposition: "inline" },
    ];
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));

    expect(attachmentGet).toHaveBeenCalledTimes(1);
    expect(attachmentGet).toHaveBeenCalledWith({ emailId: "e1ddc37d", id: "att1" });
    expect(sentPayload().attachments).toEqual([
      { filename: "deck.pdf", content: Buffer.from("bytes-of-att1").toString("base64"), contentType: "application/pdf" },
    ]);
  });

  it("names attachments it could not forward instead of failing the whole forward", async () => {
    attachments = [{ id: "big", filename: "raw.mov", size: 31 * 1024 * 1024, content_type: "video/quicktime", content_id: null, content_disposition: "attachment" }];
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));

    expect(attachmentGet).not.toHaveBeenCalled();
    expect(sentPayload().attachments).toBeUndefined();
    expect(sentPayload().text).toContain("Not forwarded (too large or unavailable, see Resend): raw.mov");
  });

  it("ignores events that are not email.received", async () => {
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post({ ...received, type: "email.delivered" }));
    expect(get).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
