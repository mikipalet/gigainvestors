import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data", "store");

/** Shared disk reader; corpus consumers preserve parse/permission errors. */
export function readJsonFile<T>(file: string, { missingOnly = false }: { missingOnly?: boolean } = {}): T | null {
  try { return JSON.parse(readFileSync(file, 'utf8')) as T; }
  catch (error) {
    if (!missingOnly || (error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export async function readJson<T>(key: string): Promise<T | null> {
  return readJsonFile<T>(path.join(ROOT,key));
}

export async function writeJson(key: string, data: unknown): Promise<string> {
  const file = path.join(ROOT, key);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
  return file;
}
