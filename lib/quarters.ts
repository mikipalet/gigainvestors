const YQ = /^(\d{4})\s*Q([1-4])$/;
const QY = /^Q([1-4])\s*(\d{4})$/;

export function parseQuarter(s: string): { y: number; q: number } | null {
  const t = s.replace(/\s+/g, " ").trim();
  const a = t.match(YQ);
  if (a) return { y: Number(a[1]), q: Number(a[2]) };
  const b = t.match(QY);
  if (b) return { y: Number(b[2]), q: Number(b[1]) };
  return null;
}

export const qKey = (y: number, q: number) => `${y} Q${q}`;

export function normalizeQuarter(s: string): string | null {
  const p = parseQuarter(s);
  return p ? qKey(p.y, p.q) : null;
}

export function compareQ(a: string, b: string): number {
  const pa = parseQuarter(a);
  const pb = parseQuarter(b);
  if (!pa || !pb) return 0;
  return pa.y - pb.y || pa.q - pb.q;
}

export function prevQ(s: string): string {
  const p = parseQuarter(s)!;
  return p.q === 1 ? qKey(p.y - 1, 4) : qKey(p.y, p.q - 1);
}

export function nextQ(s: string): string {
  const p = parseQuarter(s)!;
  return p.q === 4 ? qKey(p.y + 1, 1) : qKey(p.y, p.q + 1);
}
