export type Tier = "full" | "name" | "face" | "blank";

export function tierFor(w: number, h: number): Tier {
  const area = w * h;
  if (area >= 40000 && w >= 150) return "full";
  if (area >= 12000 && w >= 95) return "name";
  if (area >= 3000) return "face";
  return "blank";
}
