import { beforeEach, describe, expect, it, vi } from "vitest";
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

const received = {
  type: "email.received",
  created_at: "2026-09-02T12:35:44.475Z",
  data: {
    email_id: "e1ddc37d",
    from: "Luciana <luc@example.com>",
    to: ["hello@gigainvestors.com"],
    subject: "Growth for gigainvestors.com",
    attachments: [],
  },
};
const post = (event: unknown) =>
  new NextRequest("http://localhost/api/inbound", { method: "POST", body: JSON.stringify(event) });

describe("POST /api/inbound", () => {
  beforeEach(() => {
    process.env.CONTACT_FORWARD_TO = "me@example.com";
    process.env.RESEND_API_KEY = "re_test";
    send.mockClear();
    get.mockClear();
  });

  it("fetches the body by email_id, since the event carries only metadata, and forwards it with the sender as reply-to", async () => {
    const { POST } = await import("@/app/api/inbound/route");
    const res = await POST(post(received));

    expect(res.status).toBe(200);
    expect(get).toHaveBeenCalledWith("e1ddc37d");
    const sent = send.mock.calls[0]?.[0] as { text: string; html?: string; replyTo?: string; subject: string };
    expect(sent.text).toContain("the body");
    expect(sent.text).not.toContain("(no text part)");
    expect(sent.html).toContain("<p>the body</p>");
    expect(sent.replyTo).toBe("luc@example.com");
    expect(sent.subject).toBe("[gigainvestors] Growth for gigainvestors.com");
  });

  it("ignores events that are not email.received", async () => {
    const { POST } = await import("@/app/api/inbound/route");
    await POST(post({ ...received, type: "email.delivered" }));
    expect(get).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
