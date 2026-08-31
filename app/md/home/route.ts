import { getIndex } from "@/lib/data";
import { homeMarkdown, md } from "@/lib/agent-content";

export const dynamic = "force-static";

export async function GET() {
  const index = await getIndex();
  return index ? md(homeMarkdown(index)) : md("# GigaInvestors\n\nData unavailable.", 503);
}
