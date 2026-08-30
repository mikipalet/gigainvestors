import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { runSync } from "@/lib/sync/run";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const full = req.nextUrl.searchParams.get("full") === "1";
  const result = await runSync({ full });
  if (result.changed.length) {
    revalidatePath("/");
    for (const code of result.changed) revalidatePath(`/${code}`);
  }
  return NextResponse.json(result);
}
