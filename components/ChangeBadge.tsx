import type { Activity } from "@/lib/types";
import { formatChange } from "@/lib/format";

// A reported "Add 0.0%" is noise, not a move.
export const effectiveActivity = (activity: Activity, change: number | null): Activity =>
  (activity === "add" || activity === "reduce") && change !== null && Math.abs(change) < 0.05 ? "hold" : activity;

export function changeLabel(activity: Activity, change: number | null): string | null {
  if (activity === "new") return "NEW";
  if (activity === "sold") return "SOLD";
  if (activity === "add" || activity === "reduce") return formatChange(change) ?? (activity === "add" ? "+" : "−");
  return null;
}

export function ChangeBadge({ activity, change, size }: { activity: Activity; change: number | null; size: number }) {
  const label = changeLabel(activity, change);
  if (!label) return null;
  const styles: Record<Activity, string> = {
    new: "bg-buy text-paper",
    add: "bg-paper text-buy shadow-[inset_0_0_0_1px_var(--buy)]",
    reduce: "bg-paper text-sell shadow-[inset_0_0_0_1px_var(--sell)]",
    sold: "bg-sell text-paper line-through",
    hold: "",
  };
  return (
    <span
      className={`inline-block shrink-0 rounded-[2px] px-[0.4em] py-[0.1em] font-semibold leading-none tracking-wide ${styles[activity]}`}
      style={{ fontSize: size * 0.85 }}
    >
      {label}
    </span>
  );
}
