import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compareQ } from "../quarters";
import type { Prose } from "./write";

export interface IssueManifest {
  quarter: string;
  slug: string;
  headline: string;
  subject: string;
  prose?: Prose;
  stats?: { filed: number; active: number; aggregate: number };
  builtAt: string;
  sentAt?: string;
  broadcastId?: string;
  recipients?: number;
}

const DIR = path.join(process.cwd(), "data", "newsletter");
const HTML_DIR = path.join(process.cwd(), "public", "newsletter");

export const issueSlug = (quarter: string) => quarter.toLowerCase().replace(" ", "-");

export function listIssues(): IssueManifest[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".facts.json"))
    .map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as IssueManifest)
    .sort((a, b) => compareQ(b.quarter, a.quarter));
}

export function readIssue(slug: string): { manifest: IssueManifest; html: string } | null {
  const file = path.join(DIR, `${slug}.json`);
  const html = path.join(HTML_DIR, `${slug}.html`);
  if (!existsSync(file) || !existsSync(html)) return null;
  return { manifest: JSON.parse(readFileSync(file, "utf8")), html: readFileSync(html, "utf8") };
}

export function writeIssue(manifest: IssueManifest, html: string): void {
  mkdirSync(DIR, { recursive: true });
  mkdirSync(HTML_DIR, { recursive: true });
  writeFileSync(path.join(DIR, `${manifest.slug}.json`), JSON.stringify(manifest, null, 2));
  writeFileSync(path.join(HTML_DIR, `${manifest.slug}.html`), html.replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", "https://gigainvestors.com/unsubscribe"));
}

// The issue's treemap hero, rendered at 1200x640 by the build, which doubles as its social card.
export function issueHero(slug: string): string | null {
  return existsSync(path.join(HTML_DIR, `${slug}.png`)) ? `/newsletter/${slug}.png` : null;
}
