import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from "d3-hierarchy";

export interface Item {
  id: string;
  value: number;
}

export interface Rect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Tiny positions get a floor (0.35% of the pane) so the tail stays visible and
// sold ghosts read as markers instead of specks. Giants still dominate honestly.
export function layout(items: Item[], width: number, height: number, pad = 2): Rect[] {
  const positive = items.filter((i) => i.value > 0);
  const sum = positive.reduce((s, i) => s + i.value, 0);
  const children = positive.map((i) => ({ ...i, value: Math.max(i.value, sum * 0.0035) }));
  if (!children.length || width <= 0 || height <= 0) return [];
  const root = hierarchy<{ children?: Item[]; value?: number; id?: string }>({ children })
    .sum((d) => (d.children ? 0 : d.value ?? 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const laid = treemap<{ children?: Item[]; value?: number; id?: string }>()
    .size([width, height])
    .paddingInner(pad)
    .tile(treemapSquarify.ratio(1.2))(root) as HierarchyRectangularNode<{ id?: string }>;
  return laid.leaves().map((n) => ({ id: n.data.id!, x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 }));
}
