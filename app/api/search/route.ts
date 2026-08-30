import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/data";

export const dynamic = "force-static";

export async function GET() {
  const index = await getSearchIndex();
  return NextResponse.json(index ?? { investors: [], stocks: [] });
}
