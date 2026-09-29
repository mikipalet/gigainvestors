import { decodeHtmlEntities, htmlToText } from "./html-to-text";

const MARKER = "\uE000ESEF_HEADING\uE001";
type Style = { size: number; weight: number; display: string; hidden: boolean };
type Node = { tag: string; start: number; end: number; text: string; style: Style; minSize: number; minWeight: number; parent?: Node };
type Rule = { selector: string; declarations: string; specificity: number; order: number };

function declarations(source: string): Record<string, string> {
  return Object.fromEntries([...source.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)].map(m => [m[1].toLowerCase(), m[2].trim().toLowerCase()]));
}

function styled(parent: Style, source: string): Style {
  const values = declarations(source);
  const size = /^(\d*\.?\d+)(pt|px|em|rem|%)?$/.exec(values["font-size"] ?? "");
  const weight = values["font-weight"];
  return {
    size: size ? Number(size[1]) * (size[2] === "pt" ? 4 / 3 : size[2] === "em" ? parent.size : size[2] === "rem" ? 16 : size[2] === "%" ? parent.size / 100 : 1) : parent.size,
    weight: weight === "bold" || weight === "bolder" ? 700 : weight === "normal" ? 400 : /^\d+$/.test(weight ?? "") ? Number(weight) : parent.weight,
    display: values.display ?? "",
    hidden: parent.hidden || values.display === "none" || values.visibility === "hidden",
  };
}

/** Mark headings while element boundaries and typography are still available. */
export function esefHeadingText(html: string): { text: string; marker: string } {
  const rules = new Map<string, Rule[]>();
  let order = 0;
  for (const style of html.matchAll(/<style\b[^>]*>([^]*?)<\/style\s*>/gi)) {
    for (const rule of style[1].replace(/\/\*[^]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const selector of rule[1].split(",").map(s => s.trim())) {
        // ESEF generators use simple class and tag.class rules. Do not treat
        // unsupported complex selectors as if they applied to every element.
        if (!/^(?:[\w-]+)?(?:\.[\w-]+)*$/.test(selector) || !selector) continue;
        const classes = selector.match(/\.[\w-]+/g) ?? [];
        const key = classes.at(-1) ?? selector;
        const entry = { selector, declarations: rule[2], specificity: classes.length * 10 + (/^[\w]/.test(selector) ? 1 : 0), order: order++ };
        rules.set(key, [...(rules.get(key) ?? []), entry]);
      }
    }
  }
  const source = html.replace(/<!--[^]*?-->/g, "").replace(/<(script|style|ix:header)\b[^>]*>[^]*?<\/\1\s*>/gi, "");
  const stack: Node[] = [];
  const candidates: Node[] = [];
  const sizes = new Map<number, number>();
  for (const token of source.matchAll(/<[^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>|[^<]+/g)) {
    const value = token[0];
    if (!value.startsWith("<")) {
      const current = stack.at(-1);
      if (current?.style.hidden) continue;
      const text = decodeHtmlEntities(value).replace(/\s+/g, " ");
      if (current && text.trim()) {
        sizes.set(current.style.size, (sizes.get(current.style.size) ?? 0) + text.trim().length);
        for (const node of stack) {
          if (node.text.length <= 90) node.text += text;
          node.minSize = Math.min(node.minSize, current.style.size);
          node.minWeight = Math.min(node.minWeight, current.style.weight);
        }
      }
      continue;
    }
    const tag = /^<\s*(\/?)\s*([\w:-]+)/.exec(value);
    if (!tag) continue;
    const name = tag[2].toLowerCase();
    if (tag[1]) {
      if (stack.at(-1)?.tag !== name) continue;
      const node = stack.pop()!;
      node.end = token.index + value.length;
      node.text = node.text.trim();
      if (node.parent && /^(div|p|h[1-4]|tr|td|th)$/.test(name) && node.parent.text.length <= 90) node.parent.text += " ";
      if (!node.style.hidden && /^(h[1-4]|div|p|span)$/.test(name) && node.text.length > 0 && node.text.length <= 90 && !/[.,;]$/.test(node.text)) candidates.push(node);
      continue;
    }
    const attrs = Object.fromEntries([...value.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3]]));
    const classes = (attrs.class ?? "").split(/\s+/);
    const matching = [name, ...classes.map(c => "." + c)].flatMap(key => rules.get(key) ?? []).filter(rule => {
      const element = /^[\w-]+/.exec(rule.selector)?.[0];
      return (!element || element === name) && (rule.selector.match(/\.[\w-]+/g) ?? []).every(c => classes.includes(c.slice(1)));
    }).sort((a, b) => a.specificity - b.specificity || a.order - b.order);
    const parent = stack.at(-1);
    const style = styled(parent?.style ?? { size: 16, weight: 400, display: "", hidden: false },
      (/^(h[1-4]|b|strong)$/.test(name) ? "font-weight:bold;" : "") + matching.map(r => r.declarations).join(";") + ";" + (attrs.style ?? ""));
    style.hidden ||= name === "ix:hidden" || /\shidden(?:\s|=|>)/i.test(value);
    if (/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name) || /\/\s*>$/.test(value)) continue;
    stack.push({ tag: name, start: token.index, end: source.length, text: "", style, minSize: Infinity, minWeight: Infinity, parent });
  }
  // Text-weighted median prevents numerous tiny labels from defining body size.
  const total = [...sizes.values()].reduce((a, b) => a + b, 0);
  let count = 0;
  let median = 16;
  for (const [size, weight] of [...sizes].sort((a, b) => a[0] - b[0])) {
    count += weight;
    if (count >= total / 2) { median = size; break; }
  }
  const eligible = candidates.filter(node => (node.minSize > median || node.minWeight >= 600)
    && (node.tag !== "span" || /^(block|inline-block)$/.test(node.style.display) || node.parent?.text === node.text))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  // A heading wrapped in several divs/spans is one occurrence, not navigation.
  const headings: Node[] = [];
  for (const node of eligible) {
    if (headings.at(-1) && node.start < headings.at(-1)!.end) continue;
    headings.push(node);
  }
  const frequencies = new Map<string, number>();
  for (const node of headings) {
    const key = node.text.toLowerCase();
    frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
  }
  const output: string[] = [];
  let cursor = 0;
  for (const node of headings) {
    if (frequencies.get(node.text.toLowerCase())! > 3) continue;
    output.push(source.slice(cursor, node.start), `<div>${MARKER}${node.minSize}|${node.text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</div>`);
    cursor = node.end;
  }
  output.push(source.slice(cursor));
  return { text: htmlToText(output.join("")), marker: MARKER };
}
