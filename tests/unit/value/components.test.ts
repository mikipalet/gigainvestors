import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seriesPath, scale } from '@/lib/value/viz/layout';
import { Bridge } from "@/components/value/Bridge";
import { TestSection } from "@/components/value/TestSection";
import type { Dossier } from "@/lib/value/types";
import { readFileSync } from "node:fs";

const dossier: Dossier = JSON.parse(readFileSync("tests/fixtures/value/store/dossiers/027.json", "utf8"))["KO.US"];

describe("value evidence presentation", () => {
  it("preserves gaps and avoids invalid coordinates in constant series", () => {
    const path=seriesPath({series:[[2020,.2],[2021,.2],[2022,null],[2023,.2]],x:scale({domain:[2020,2023],range:[0,100]}),y:scale({domain:[.2,.2],range:[0,30]})});
    expect(path.match(/M/g)).toHaveLength(2);
    expect(path).not.toMatch(/NaN|Infinity/);
  });
  it("shows the per-share result, assumptions and equity bond comparison", () => {
    if (!dossier.valuation) throw new Error("Fixture valuation missing");
    const html = renderToStaticMarkup(createElement(Bridge, { valuation: dossier.valuation }));
    expect(html).toContain("$36.78");
    expect(html).toContain("Government bond yield");
    expect(html).toContain("Growth fades to terminal growth");
  });
  it("shows source likelihoods without gap wording", () => {
    const test = dossier.tests.moat;
    const html = renderToStaticMarkup(createElement(TestSection, { test: { ...test, jev: test.jev.map((answer) => ({ ...answer, trusted: false })) } }));
    expect(html).toContain("9 in 10");
    expect(html).not.toContain("Our brands encourage repeat purchases.");
    expect(html).not.toContain("Informational only");
    expect(html).toContain("Item 1 · Business");
  });
});
