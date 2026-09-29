import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("extracts headings promptly when CSS includes large embedded images", () => {
  // Real ESEF styles include base64 images. An unanchored declaration regex
  // rescans every suffix after the data URI's semicolon and stalls extraction.
  const html = `<style>.heading { background:url("data:image/png;base64,${"A".repeat(200_000)}"); font-weight:bold; }</style>
    <div class="heading">Business overview</div><p>We make chips.</p>`;
  const output = execFileSync(process.execPath, ["--import", "tsx", "--eval", `
    const { readFileSync } = require("node:fs");
    const { esefHeadingText } = require("./lib/value/reports/esef-headings.ts");
    process.stdout.write(esefHeadingText(readFileSync(0, "utf8")).text);
  `], { input: html, encoding: "utf8", timeout: 5000 });
  expect(output).toContain("ESEF_HEADING\uE00116|Business overview");
});
