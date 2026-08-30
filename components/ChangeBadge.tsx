import type { Activity } from "@/lib/types";
import { formatChange } from "@/lib/format";

export function changeLabel(activity: Activity, change: number | null): string | null {
  if (activity === "new") return "NEW";
  if (activity === "sold") return "SOLD";
  if (activity === "add" || activity === "reduce") return formatChange(change) ?? (activity === "add" ? "+" : "−");
  return null;
}

export function ChangeBadge({ activity, change, size }: { activity: Activity; change: number | null; size: number }) {
  const label = changeLabel(activity, change);
  if (!label) return null;
  const strong = activity === "new" || activity === "sold";
  return (
    <span
      className={`inline-block shrink-0 rounded-[2px] px-[0.4em] py-[0.1em] font-semibold leading-none tracking-wide ${
        strong ? "bg-ink text-paper" : "bg-paper text-ink shadow-[inset_0_0_0_1px_var(--ink)]"
      } ${activity === "sold" ? "line-through" : ""}`}
      style={{ fontSize: size * 0.85 }}
    >
      {label}
    </span>
  );
}
