// Jev reads statements literally, so each one is positive and self-contained. The wording and both thresholds
// were tuned against the mail the address has really received; reword only with a fresh comparison.
const QUESTIONS = {
  pitch: {
    type: "noul",
    instructions:
      "This email is an unsolicited commercial pitch or solicitation (for example SEO, web design, software development, lead generation, social media, marketing services, guest posts, link exchange, recruiting or an investment offer) sent by someone selling or offering a service.",
  },
  reader: {
    type: "noul",
    instructions: "This email is from a reader, subscriber, journalist or investor writing about the site's content or data.",
  },
};
const PITCH_AT_LEAST = 0.9;
const READER_BELOW = 0.5;

// Fails open: an unavailable, slow or unparseable classifier returns false so a real message is never lost.
// A reader who also sells something scores high on both statements and is forwarded.
export async function isColdOutreach({ from, subject, text }: { from: string; subject: string; text: string }): Promise<boolean> {
  const key = process.env.JEV_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "jev-latest", state: `From: ${from}\nSubject: ${subject}\n\n${text.slice(0, 6000)}`, questions: QUESTIONS }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const { answers } = (await res.json()) as { answers?: Record<string, { noul?: unknown } | undefined> };
    const pitch = answers?.pitch?.noul;
    const reader = answers?.reader?.noul;
    return typeof pitch === "number" && typeof reader === "number" && pitch >= PITCH_AT_LEAST && reader < READER_BELOW;
  } catch {
    return false;
  }
}
