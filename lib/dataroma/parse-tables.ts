export interface Cell {
  text: string;
  href?: string;
  cls?: string;
}

export type Row = Cell[];
export type Table = Row[];

const decode = (s: string) =>
  s
    .replace(/&nbsp;?/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8801;?/g, "")
    .replace(/&#9660;?/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const clean = (s: string) => decode(s).replace(/\s+/g, " ").trim();

// dataroma emits rows without an opening <tr> after a header row, so a <td>
// outside any row implicitly opens one.
export function parseTables(html: string): Table[] {
  const tables: Table[] = [];
  let row: Row | null = null;
  let cell: Cell | null = null;
  let buf = "";
  const re = /<\/?(table|tr|td|th|a|script|style)\b([^>]*)>|([^<]+)|<[^>]*>/gi;
  let skip = false;
  let m: RegExpExecArray | null;

  const closeCell = () => {
    if (cell && row) {
      cell.text = clean(buf);
      row.push(cell);
    }
    cell = null;
    buf = "";
  };
  const closeRow = () => {
    closeCell();
    if (row && row.length && tables.length) tables[tables.length - 1].push(row);
    row = null;
  };

  while ((m = re.exec(html))) {
    const [full, tag, attrs, text] = m;
    if (text !== undefined) {
      if (cell && !skip) buf += text;
      continue;
    }
    if (!tag) continue;
    const closing = full.startsWith("</");
    const t = tag.toLowerCase();
    if (t === "script" || t === "style") {
      skip = !closing;
      continue;
    }
    if (t === "table") {
      if (closing) closeRow();
      else tables.push([]);
    } else if (t === "tr") {
      closeRow();
      if (!closing) row = [];
    } else if (t === "td" || t === "th") {
      closeCell();
      if (!closing) {
        if (!row) row = [];
        const cls = /class="([^"]*)"/i.exec(attrs)?.[1];
        cell = { text: "", ...(cls ? { cls } : {}) };
      }
    } else if (t === "a" && !closing && cell) {
      const href = /href="([^"]*)"/i.exec(attrs)?.[1];
      if (href && !cell.href) cell.href = decode(href);
    }
  }
  closeRow();
  return tables;
}

export const parseNumber = (s: string): number => {
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const parseMoney = (s: string): number => {
  const m = s.replace(/,/g, "").match(/\$?\s*([0-9.]+)\s*([BMK]?)/i);
  if (!m) return 0;
  const mult = { B: 1e9, M: 1e6, K: 1e3, "": 1 }[m[2].toUpperCase() as "B" | "M" | "K" | ""];
  return Math.round(Number(m[1]) * mult);
};
