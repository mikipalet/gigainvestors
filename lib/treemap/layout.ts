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

export function layout(items: Item[], width: number, height: number, pad = 2): Rect[] {
  const children = items.filter((i) => i.value > 0);
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
