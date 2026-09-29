import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MiniSeries } from "@/components/value/MiniSeries";
import { Bridge } from "@/components/value/Bridge";
import { TestSection } from "@/components/value/TestSection";
import type { Dossier } from "@/lib/value/types";
import { readFileSync } from "node:fs";

const dossier: Dossier = JSON.parse(readFileSync("tests/fixtures/value/store/dossiers/027.json", "utf8"))["KO.US"];

describe("value evidence presentation", () => {
  it("preserves gaps and avoids invalid coordinates in constant series", () => {
    const html = renderToStaticMarkup(createElement(MiniSeries, { label: "ROIC", series: [[2020, 0.2], [2021, 0.2], [2022, null], [2023, 0.2]] }));
    expect(html.match(/<polyline/g)).toHaveLength(2);
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(html).toContain("2020 to 2023");
  });
  it("shows missing data without drawing a zero-valued trend", () => {
    const html = renderToStaticMarkup(createElement(MiniSeries, { label: "ROIC", series: [[2020, null]] }));
    expect(html).toContain("no data");
    expect(html).not.toContain("<polyline");
  });
  it("shows the per-share result, assumptions and equity bond comparison", () => {
    if (!dossier.valuation) throw new Error("Fixture valuation missing");
    const html = renderToStaticMarkup(createElement(Bridge, { valuation: dossier.valuation }));
    expect(html).toContain("USD 36.78");
    expect(html).toContain("Government bond yield");
    expect(html).toContain("Growth fades to terminal growth");
  });
  it("shows source evidence and flags untrusted answers as informational", () => {
    const test = dossier.tests.moat;
    const html = renderToStaticMarkup(createElement(TestSection, { test: { ...test, jev: test.jev.map((answer) => ({ ...answer, trusted: false })) } }));
    expect(html).toContain("9 in 10");
    expect(html).not.toContain("Our brands encourage repeat purchases.");
    expect(html).toContain("Informational only");
    expect(html).toContain("Item 1 · Business");
  });
});
