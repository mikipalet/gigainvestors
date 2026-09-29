import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local"), quiet: true });

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
  for (const arg of args) {
    if (arg === "--force") force = true;
    else if (arg.startsWith("--only=")) {
      only = arg.slice(7).split(",").map((id) => id.trim()).filter(Boolean);
      if (!only.length) throw new Error("--only requires at least one ID");
    } else if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice(8));
      if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error("--limit must be a positive integer");
    } else {
      throw new Error("Expected --only=ID,ID, --limit=N, or --force");
    }
  }

  const module = await import(pathToFileURL(path.join(directory, `${stage}.ts`)).href);
  await module.default({ only, limit, force });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Value stage failed");
  process.exitCode = 1;
});
