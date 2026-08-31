export interface Person {
  name: string;
  slug: string;
  code: string;
}

// The people a paragraph names, in the order the paragraph names them, so the faces beside it
// read left to right in the same order as the prose.
export function mentionedIn(text: string, people: Person[], limit = 5): Person[] {
  return people
    .map((p) => ({ p, at: text.search(new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.p)
    .slice(0, limit);
}
