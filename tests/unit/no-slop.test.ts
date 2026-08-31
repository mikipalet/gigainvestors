import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Copy lint: the no-ai-slop rules, enforced on every build so the patterns cannot creep back in.
const FILES = ["emails/QuarterIssue.tsx", "lib/pages.ts", "app/newsletter/page.tsx", "app/newsletter/NewsletterClient.tsx", "app/api/subscribe/route.ts", "public/llms.txt", "README.md", "app/not-found.tsx", "app/munger/Munger.tsx", "app/[code]/NoHoldings.tsx"];
const BANNED_WORDS = /\b(delve|foster|leverage|utilize|facilitate|empower|streamline|robust|cutting-edge|paradigm shift|game changer|tapestry|realm|beacon|multifaceted|meticulous|intricate|paramount|transformative|elevate|embark|supercharge|harness|ever-evolving)\b/i;
const EMPTY_PHRASES = /(it'?s worth noting|it'?s important to note|at the end of the day|when it comes to|at its core|in today'?s world|in the age of|in the world of|the reality is|the truth is|in order to|going forward|let'?s dive in|here'?s the thing|let me be clear|what nobody tells you|the part everyone misses|marks a pivotal moment|a testament to|experts agree|studies show)/i;
const BINARY_CONTRAST = /\b(it'?s not (just )?[^.]{2,40}\. it'?s )/i;

describe("copy has no AI-slop patterns", () => {
  for (const f of FILES) {
    it(f, () => {
      const text = readFileSync(f, "utf8");
      expect(text.match(BANNED_WORDS)?.[0], `banned word in ${f}`).toBeUndefined();
      expect(text.match(EMPTY_PHRASES)?.[0], `empty phrase in ${f}`).toBeUndefined();
      expect(text.match(BINARY_CONTRAST)?.[0], `binary contrast in ${f}`).toBeUndefined();
    });
  }
});
