export interface HeadGeometry {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const INK = 40;

// Where the skull sits inside a portrait, as fractions of the image: the widest ink row
// in the upper part of the drawing is the head (hair, temples or ears), and a head is
// about 1.3 times taller than wide. Long hair widens the row, which the width cap absorbs.
export function headGeometry({ alpha, w, h }: { alpha: Uint8Array | Uint8ClampedArray; w: number; h: number }): HeadGeometry {
  let top = -1;
  let bottom = -1;
  const rows: { l: number; r: number }[] = [];
  for (let y = 0; y < h; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > INK) {
        if (l < 0) l = x;
        r = x;
      }
    }
    rows.push({ l, r });
    if (l >= 0) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  if (top < 0) return { cx: 0.5, cy: 0.33, rx: 0.3, ry: 0.39 };
  const inkH = bottom - top;
  let best = 0;
  let bestWidth = 0;
  for (let y = top; y <= top + inkH * 0.42; y++) {
    const width = rows[y].r - rows[y].l;
    if (width > bestWidth) (bestWidth = width), (best = y);
  }
  const rx = Math.min(bestWidth / 2, w * 0.36);
  const ry = rx * 1.3;
  return { cx: (rows[best].l + rows[best].r) / 2 / w, cy: (top + ry * 0.98) / h, rx: rx / w, ry: ry / h };
}
