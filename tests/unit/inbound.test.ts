import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const send = vi.fn(async (_payload: unknown) => ({ data: { id: "sent" }, error: null }));
const get = vi.fn(async () => ({
  data: {
    id: "e1ddc37d",
    from: "Luciana <luc@example.com>",
    to: ["hello@gigainvestors.com"],
    subject: "Growth for gigainvestors.com",
    text: "Hello there,\n\nthe body",
    html: "<p>the body</p>",
  },
  error: null,
}));
vi.mock("resend", () => ({ Resend: class { emails = { send, receiving: { get } }; } }));
vi.mock("@/lib/newsletter/webhook", () => ({ verifySvix: () => true }));

const verdict = vi.fn<() => Promise<Response>>();
const modelSays = (word: string) =>
  verdict.mockResolvedValue(new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: word }] })));

const received = {
  type: "email.received",
  created_at: "2026-09-02T12:35:44.475Z",
  data: { email_id: "e1ddc37d" },
};
const post = (event: unknown) =>
  new NextRequest("http://localhost/api/inbound", { method: "POST", body: JSON.stringify(event) });
const sentPayload = () => send.mock.calls[0]?.[0] as { text: string; html?: string; replyTo?: string; subject: string };

describe("POST /api/inbound", () => {
  beforeEach(() => {
    process.env.CONTACT_FORWARD_TO = "me@example.com";
    process.env.RESEND_API_KEY = "re_test";
    process.env.ANTHROPIC_API_KEY = "sk-test";
    send.mockClear();
    get.mockClear();
    vi.stubGlobal("fetch", verdict);
    modelSays("person");
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
    modelSays("pitch");
    const { POST } = await import("@/app/api/inbound/route");
    const res = await POST(post(received));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, forwarded: false, reason: "cold-outreach" });
    expect(send).not.toHaveBeenCalled();
  });

  it("forwards when the classifier is unavailable, because losing a real message is worse than seeing a pitch", async () => {
    verdict.mockResolvedValue(new Response("overloaded", { status: 529 }));
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post(received));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("ignores events that are not email.received", async () => {
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post({ ...received, type: "email.delivered" }));
    expect(get).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
