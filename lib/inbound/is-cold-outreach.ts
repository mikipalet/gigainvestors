const SYSTEM = `You screen mail sent to hello@gigainvestors.com, the contact address of GigaInvestors, a free site that visualises the 13F filings of well-known investors and sends a quarterly newsletter.

Answer with exactly one word.
"pitch" when the sender is selling or soliciting: SEO, web design, development, lead generation, growth, social media, marketing, guest posts, link exchanges, partnerships proposed by someone who has clearly never used the site, recruiting, investment offers, or any template sent to many sites.
"person" for everything else: readers, questions, bug reports, data corrections, press, subscribers, investors mentioned on the site, and anything you are unsure about.`;

// Fails open: an unavailable or unparseable classifier returns false so a real message is never lost.
export async function isColdOutreach({ from, subject, text }: { from: string; subject: string; text: string }): Promise<boolean> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 5,
        system: SYSTEM,
        messages: [{ role: "user", content: `From: ${from}\nSubject: ${subject}\n\n${text.slice(0, 6000)}` }],
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const word = data.content.find((c) => c.type === "text")?.text?.trim().toLowerCase() ?? "";
    return word.startsWith("pitch");
  } catch {
    return false;
  }
}
