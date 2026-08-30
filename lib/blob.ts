import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data", "store");

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, key), "utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, data: unknown): Promise<string> {
  const file = path.join(ROOT, key);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
  return file;
}
