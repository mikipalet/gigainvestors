import { ResearchBudgetError } from '../../lib/value/budget';
import { readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local"), quiet: true });

dotenv.config({ path: path.join(process.env.VALUE_CORPUS_DIR ?? path.join(os.homedir(), 'value-corpus'), '.env.local'), quiet: true });

async function main(): Promise<void> {
  const directory = path.join(__dirname, "stages");
  let stages: string[] = [];
  try {
    stages = readdirSync(directory).filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
      .map((file) => file.slice(0, -3)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const [stage, ...args] = process.argv.slice(2);
  if (!stages.includes(stage)) {
    console.error(`Unknown stage. Available stages: ${stages.join(", ") || "(none installed)"}`);
    process.exitCode = 1;
    return;
  }

  let only: string[] | undefined;
  let limit: number | undefined;
  let force = false;
  let membersFirst = false;
  let offline = false;
  let cachedReadings = false;
  let cachedNews = false;
  let existing = false;
  let existingAnalysis = false;
  let additionsOnly = false;
  let out: string | undefined;
  let overwrite = false;
  let from: string | undefined;
  let to: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--cached-news" && stage === "price-story") cachedNews = true;
    else if (arg === "--members-first" && stage === "fundamentals") membersFirst = true;
    else if (arg === "--offline" && ["index-membership","business-backfill","price-story"].includes(stage)) offline = true;
    else if (stage === "calibrate" && arg === "--existing") existing = true;
    else if (stage === "calibrate" && arg === "--cached-readings") cachedReadings = true;
    else if (stage === "publish" && arg === "--existing-analysis") existingAnalysis = true;
    else if (stage === "publish" && arg === "--additions-only") additionsOnly = true;
    else if (stage === "publish" && arg === "--overwrite") overwrite = true;
    else if (arg === "--force") force = true;
    else if (stage === "publish" && (arg === "--out" || arg.startsWith("--out="))) {
      out = arg === "--out" ? args[++i] : arg.slice(6);
      if (!out || out.startsWith("--")) throw new Error("--out requires a directory");
    }
    else if (stage === "japan" && (arg.startsWith("--from=") || arg.startsWith("--to=") || arg === "--from" || arg === "--to")) {
      const [flag, inline] = arg.split("=");
      const value = inline ?? args[++i];
      if (!value || value.startsWith("--")) throw new Error(`${flag} requires a date`);
      if (flag === "--from") from = value;
      else to = value;
    }
    else if (arg.startsWith("--only=")) {
      only = arg.slice(7).split(",").map((id) => id.trim()).filter(Boolean);
      if (!only.length) throw new Error("--only requires at least one ID");
    } else if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice(8));
      if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error("--limit must be a positive integer");
    } else {
      throw new Error("Expected --only=ID,ID, --limit=N, --force, fundamentals --members-first, index-membership --offline, publish --out=DIR, or japan --from=YYYY-MM-DD --to=YYYY-MM-DD");
    }
  }

  if (overwrite && !out) throw new Error("--overwrite requires local --out");
  const module = await import(pathToFileURL(path.join(directory, `${stage}.ts`)).href);
  await module.default({ only, limit, force, from, to, out, overwrite, membersFirst, offline, cachedReadings, cachedNews, existing, existingAnalysis, additionsOnly });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Value stage failed");
  process.exitCode = error instanceof ResearchBudgetError ? 75 : 1;
});
