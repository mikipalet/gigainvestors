import type { Activity } from "./types";

// Surface strength follows the size of the move, not just its direction.
export function surfaceFor(activity: Activity, change: number | null | undefined, strongNew = false): string {
  const m = Math.abs(change ?? 0);
  const step = m >= 25 ? 3 : m >= 5 ? 2 : 1;
  if (activity === "new") return strongNew ? "buy-solid" : "add-3";
  if (activity === "add") return `add-${step}`;
  if (activity === "reduce") return `hatch-${step}`;
  if (activity === "sold") return "ghost";
  return "";
}
