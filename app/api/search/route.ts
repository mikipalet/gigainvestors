import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/data";

export const revalidate = 86400;

export async function GET() {
  const index = await getSearchIndex();
  if (!index) return NextResponse.json({ investors: [], stocks: [] }, { status: 503 });
  return NextResponse.json(index, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
