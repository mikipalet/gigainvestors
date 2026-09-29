const entities: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ensp: " ", emsp: " ", thinsp: " ",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", bull: "•", hellip: "…",
  copy: "©", reg: "®", trade: "™", euro: "€", pound: "£", yen: "¥", cent: "¢", sect: "§", para: "¶",
  times: "×", divide: "÷", minus: "−", le: "≤", ge: "≥", shy: "", zwj: "", zwnj: "",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", auml: "ä", ouml: "ö", uuml: "ü",
  Eacute: "É", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", ccedil: "ç", icirc: "î", ocirc: "ô", ucirc: "û",
};

function decode(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (entity, name: string) => {
    if (!name.startsWith("#")) return entities[name] ?? entity;
    const point = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
      ? String.fromCodePoint(point) : "�";
  });
}

export function htmlToText(html: string): string {
  const source = html.replace(/<!--[^]*?-->/g, "")
    .replace(/<(script|style|ix:header)\b[^>]*>[^]*?<\/\1\s*>/gi, "");
  const tokens = source.match(/<[^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>|[^<]+/g) ?? [];
  const output: string[] = [];
  const stack: string[] = [];
  for (const token of tokens) {
    if (!token.startsWith("<")) {
      if (!stack.length) output.push(decode(token));
      continue;
    }
    const tag = /^<\s*(\/?)\s*([\w:-]+)/.exec(token);
    if (!tag) continue;
    const name = tag[2].toLowerCase();
    const closing = Boolean(tag[1]);
    const voidTag = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name) || /\/\s*>$/.test(token);
    if (stack.length) {
      if (closing && name === stack[stack.length - 1]) stack.pop();
      else if (!closing && !voidTag) stack.push(name);
      continue;
    }
    if (!closing && !voidTag && (name === "ix:hidden" || /\shidden(?:\s|=|>)/i.test(token)
      || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(token))) {
      stack.push(name);
      continue;
    }
    if (/^(p|div|h[1-6]|section|article|li|tr|br|hr|table)$/.test(name)) output.push("\n\n");
    else if (/^(td|th)$/.test(name)) output.push(" ");
  }
  return output.join("").replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
