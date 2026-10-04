import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { GET as llms } from '@/app/llms.txt/route';
import { GET as llmsFull } from '@/app/llms-full.txt/route';
import { methodMarkdown } from '@/lib/agents/method';

// Keep external publication reads deterministic; exercise the real generated copy.
vi.mock('@/lib/data', () => ({ getIndex: async () => null, getAllStockTickers: async () => [] }));
vi.mock('@/lib/value/store', () => ({ getMeta: async () => null, getDefaultIndex: async () => [] }));
vi.mock('@/lib/newsletter/store', () => ({ listIssues: () => [] }));
afterEach(() => vi.restoreAllMocks());

// Copy lint: the no-ai-slop rules, enforced on every build so the patterns cannot creep back in.
const FILES = ["emails/QuarterIssue.tsx", "emails/ConfirmEmail.tsx", "lib/pages.ts", "app/newsletter/page.tsx", "app/newsletter/NewsletterClient.tsx", "app/unsubscribe/UnsubscribeClient.tsx", "app/api/subscribe/route.ts", "README.md", "app/not-found.tsx", "app/munger/Munger.tsx", "app/[code]/NoHoldings.tsx"];
const BANNED_WORDS = /\b(delve|foster|leverage|utilize|facilitate|empower|streamline|robust|cutting-edge|paradigm shift|game changer|tapestry|realm|beacon|multifaceted|meticulous|intricate|paramount|transformative|elevate|embark|supercharge|harness|ever-evolving)\b/i;
const EMPTY_PHRASES = /(it'?s worth noting|it'?s important to note|at the end of the day|when it comes to|at its core|in today'?s world|in the age of|in the world of|the reality is|the truth is|in order to|going forward|let'?s dive in|here'?s the thing|let me be clear|what nobody tells you|the part everyone misses|marks a pivotal moment|a testament to|experts agree|studies show)/i;
const BINARY_CONTRAST = /\b(it'?s not (just )?[^.]{2,40}\. it'?s )/i;

function checkCopy(text: string, source: string) {
  expect(text.match(BANNED_WORDS)?.[0], `banned word in ${source}`).toBeUndefined();
  expect(text.match(EMPTY_PHRASES)?.[0], `empty phrase in ${source}`).toBeUndefined();
  expect(text.match(BINARY_CONTRAST)?.[0], `binary contrast in ${source}`).toBeUndefined();
}

describe("copy has no AI-slop patterns", () => {
  for (const host of ['gigainvestors.com', 'value.gigainvestors.com']) {
    for (const [pathname, handler] of [['llms.txt', llms], ['llms-full.txt', llmsFull]] as const) {
      it(`${host}/${pathname}`, async () => {
        const response = await handler(new Request(`https://${host}/${pathname}`));
        expect(response.status).toBe(200);
        const text = await response.text();
        expect(text).toContain('Method in 10 lines:');
        if (pathname === 'llms-full.txt') expect(text).toContain('Every numerical cutoff');
        checkCopy(text, `${host}/${pathname}`);
      });
    }
  }
  it('method Markdown', () => checkCopy(methodMarkdown(), 'method Markdown'));
  for (const f of FILES) {
    it(f, () => {
      const text = readFileSync(f, "utf8");
      checkCopy(text, f);
    });
  }
});
