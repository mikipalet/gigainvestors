import { readJsonFile } from '../blob';
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export function corpusDir(): string {
  return process.env.VALUE_CORPUS_DIR ?? path.join(os.homedir(), "value-corpus");
}

export function corpusPath(...parts: string[]): string {
  return path.join(corpusDir(), ...parts);
}

function readText(rel: string): string | null {
  try {
    return readFileSync(corpusPath(rel), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function readCorpusJson<T>(rel: string): T | null {
  return readJsonFile<T>(corpusPath(rel), {missingOnly:true});
}

export function writeCorpusJson(rel: string, data: unknown): void {
  const destination = corpusPath(rel);
  const serialized = JSON.stringify(data);
  if (serialized === undefined) throw new TypeError("Corpus data must be JSON serializable");
  mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, serialized + "\n", { flag: "wx" });
    renameSync(temporary, destination);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function appendJsonl(rel: string, row: unknown): void {
  const destination = corpusPath(rel);
  const serialized = JSON.stringify(row);
  if (serialized === undefined) throw new TypeError("Corpus row must be JSON serializable");
  mkdirSync(path.dirname(destination), { recursive: true });
  appendFileSync(destination, serialized + "\n");
}

export function readJsonl<T>(rel: string): T[] {
  const text = readText(rel);
  if (text === null) return [];
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}
