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

let answers: unknown = { pitch: { type: "noul", noul: 0.02 }, reader: { type: "noul", noul: 0.95 } };
let classifierStatus = 200;
let classifierHangs = false;
const fakeFetch = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
  const href = String(url);
  if (href.startsWith("https://files.test/")) return new Response(`bytes-of-${href.split("/").pop()}`);
  if (classifierHangs) throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  const body = JSON.stringify({ model: "jev-1.13.0", answers, usage: { input_tokens: 450 } });
  return new Response(classifierStatus === 200 ? body : "overloaded", { status: classifierStatus });
});
const nouls = (pitch: number, reader: number) => ({ pitch: { type: "noul", noul: pitch }, reader: { type: "noul", noul: reader } });
const classifierCall = () => fakeFetch.mock.calls.find(([url]) => String(url) === "https://api.typesafe.ai/v1/systemone");

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
    process.env.JEV_API_KEY = "jev-test";
    send.mockClear();
    fakeFetch.mockClear();
    get.mockClear();
    attachmentGet.mockClear();
    attachments = [];
    answers = nouls(0.02, 0.95);
    classifierStatus = 200;
    classifierHangs = false;
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
    answers = nouls(0.94, 0.18);
    const { POST } = await import("@/app/api/inbound/route");
    const res = await POST(post(received));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, forwarded: false, reason: "cold-outreach" });
    expect(send).not.toHaveBeenCalled();
  });

  it("shows the classifier the sender, the subject and the body, with a deadline so a slow answer cannot hold the webhook", async () => {
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));

    const init = classifierCall()?.[1];
    const sent = JSON.parse(String(init?.body)) as { model: string; state: string; questions: Record<string, { type: string }> };
    expect(sent.state).toBe("From: Luciana <luc@example.com>\nSubject: Growth for gigainvestors.com\n\nHello there,\n\nthe body");
    expect(Object.keys(sent.questions)).toEqual(["pitch", "reader"]);
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer jev-test");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("forwards a likely pitch that falls short of the drop threshold, because unsure means forward", async () => {
    answers = nouls(0.89, 0.05);
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("forwards a pitch that also reads as coming from a reader", async () => {
    answers = nouls(0.95, 0.64);
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("forwards when the classifier is unavailable, because losing a real message is worse than seeing a pitch", async () => {
    classifierStatus = 529;
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("forwards when the classifier times out", async () => {
    classifierHangs = true;
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("forwards when the classifier answers without both probabilities", async () => {
    answers = { pitch: { type: "noul", noul: 0.99 } };
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("forwards without asking the classifier when its key is not configured", async () => {
    delete process.env.JEV_API_KEY;
    answers = nouls(0.99, 0.01);
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));
    expect(classifierCall()).toBeUndefined();
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
