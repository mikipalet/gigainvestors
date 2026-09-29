import type { Id } from "./types";

export function fnv1a32(s: string): number {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(s)) {
    hash = Math.imul(hash ^ byte, 0x01000193);
  }
  return hash >>> 0;
}

export function shardOf(id: Id): string {
  return String(fnv1a32(id) % 600).padStart(3, "0");
}
