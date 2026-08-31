export type Tier = "full" | "name" | "face" | "blank";

// Thresholds are readability minimums, so they have to shrink with the canvas: a 95px floor
// on a 1440px screen is a quarter of a phone's width, which is why phones showed no names.
export function tierFor(w: number, h: number, canvasW = 1440): Tier {
  const narrow = canvasW > 0 && canvasW < 640;
  const area = w * h;
  if (area >= (narrow ? 16000 : 40000) && w >= (narrow ? 110 : 150)) return "full";
  if (area >= (narrow ? 4000 : 12000) && w >= (narrow ? 64 : 95)) return "name";
  if (area >= (narrow ? 1400 : 3000)) return "face";
  return "blank";
}
