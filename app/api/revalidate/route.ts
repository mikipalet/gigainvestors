import { revalidatePath, updateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  updateTag("blob");
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true });
}
