import type { Activity } from "@/lib/types";
import { formatChange } from "@/lib/format";

// A reported "Add 0.0%" is noise, not a move.
export const effectiveActivity = (activity: Activity, change: number | null): Activity =>
  (activity === "add" || activity === "reduce") && change !== null && Math.abs(change) < 0.05 ? "hold" : activity;

function changeLabel(activity: Activity, change: number | null): string | null {
  if (activity === "new") return "NEW";
  if (activity === "sold") return "SOLD";
  if (activity === "add" || activity === "reduce") return formatChange(change) ?? (activity === "add" ? "+" : "−");
  return null;
}

export function ChangeBadge({ activity, change, size }: { activity: Activity; change: number | null; size: number }) {
  const label = changeLabel(activity, change);
  if (!label) return null;
  const styles: Record<Activity, string> = {
    new: "activity-badge activity-buy",
    add: "activity-badge activity-buy",
    reduce: "activity-badge activity-sell",
    sold: "activity-badge activity-sold line-through",
    hold: "",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[2px] px-[0.45em] pb-[0.3em] pt-[0.34em] font-semibold leading-none tracking-wide ${styles[activity]}`}
      style={{ fontSize: Math.max(13,size * 0.85) }}
    >
      {label}
    </span>
  );
}
