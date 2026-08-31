import { md } from "@/lib/agent-content";
import { PAGES } from "@/lib/pages";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const page = PAGES[slug];
  if (!page) return md("# Not found", 404);
  return md(`# ${page.title}\n\n${page.paragraphs.join("\n\n")}`);
}
