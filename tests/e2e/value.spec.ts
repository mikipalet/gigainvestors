import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("tests/fixtures/value/store");

test.beforeEach(async ({ page }) => {
  await page.route("https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/**", async (route) => {
    const file = new URL(route.request().url()).pathname.split("/main/")[1];
    try {
      const body = file === "prices/US.json"
        ? JSON.stringify({ "KO.US": [60, "2026-09-28"], "DAL.US": [50, "2026-09-28"] })
        : await readFile(path.join(root, file), "utf8");
      await route.fulfill({ contentType: "application/json", body });
    } catch {
      await route.fulfill({ status: 404, body: "{}" });
    }
  });
});

test("quality default, near misses, live price sorting and insufficient rows", async ({ page }) => {
  await page.goto("/value");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Buffett's checklist");
  await expect(page.getByRole("row", { name: /Coca-Cola/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Delta Air/ })).toHaveCount(0);
  await page.getByLabel("Near misses").check();
  await expect(page.getByRole("row", { name: /Delta Air/ })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toContainText("Coca-Cola");
  await expect(page.getByRole("row", { name: /Coca-Cola/ })).toContainText("40.0%");
  await page.getByLabel("Country", { exact: true }).selectOption("US");
  await expect(page.getByRole("row", { name: /Sparse Company/ })).toHaveClass(/opacity-40/);
  await expect(page).toHaveURL(/country=US/);
  await page.reload();
  await expect(page.getByLabel("Near misses")).toBeChecked();
  await page.getByRole("button", { name: "Name", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Coca-Cola");
});

test("dossier sections, evidence, bridge and missing price", async ({ page }) => {
  await page.goto("/value/ko.us");
  await expect(page.locator("section[data-test] h2")).toHaveText([
    "Understandable", "Moat", "Economics", "Management", "Accounting", "Price",
  ]);
  await expect(page.getByTestId("valuation-bridge").locator("dl > div").last()).toContainText("Per-share value");
  await expect(page.getByTestId("valuation-bridge").locator("dl > div").last()).toContainText("100.00");
  await expect(page.getByTestId("verdict")).toContainText("no price");
  await expect(page.locator('section[data-test="price"]')).toContainText("unclear");
  await expect(page.getByText("Our brands encourage repeat purchases.")).toBeVisible();
  await expect(page.getByText("Read: 10-K filed 2026-02-20")).toBeVisible();
  await expect(page.getByRole("link", { name: /Warren Buffett/ })).toHaveAttribute("href", "https://gigainvestors.com/s/KO");
});

test("unknown dossier returns 404", async ({ page }) => {
  const response = await page.goto("/value/nope.us");
  expect(response?.status()).toBe(404);
});

test("country filters expose failures and combine sector, tags and holders", async ({ page }) => {
  await page.goto("/value?country=US&near=1");
  await expect(page.getByRole("row", { name: /Delta Air/ })).toBeVisible();
  await page.getByRole("button", { name: "Moat: any" }).click();
  await expect(page.getByRole("row", { name: /Delta Air/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Moat: pass" }).click();
  await expect(page.getByRole("row", { name: /Delta Air/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Coca-Cola/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Moat: fail" }).click();
  await page.getByLabel("Held by superinvestors").check();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Held by superinvestors").uncheck();
  await page.getByRole("button", { name: "Brand advantage" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Brand advantage" }).click();
  await page.getByLabel("Sector", { exact: true }).selectOption("Industrials");
  await expect(page.getByRole("row", { name: /Coca-Cola/ })).toHaveCount(0);
});

test("limits the table and expands without losing sorting", async ({ page }) => {
  const rows = JSON.parse(await readFile(path.join(root, "index/US.json"), "utf8"));
  await page.route("**/main/index/US.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(Array.from({ length: 205 }, (_, index) => ({ ...rows[0], id: `FIX${index}.US`, n: `Company ${String(index).padStart(3, "0")}` }))) }));
  await page.goto("/value?country=US&sort=name&direction=asc");
  await expect(page.locator("tbody tr")).toHaveCount(200);
  await page.getByRole("button", { name: "Show more" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(205);
  await expect(page.locator("tbody tr").last()).toContainText("Company 204");
});

test("subdomain rewrites dotted company IDs and its own sitemap", async ({ request }) => {
  const response = await request.get("/ko.us", { headers: { host: "value.gigainvestors.com" } });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Coca-Cola");
  expect(await response.text()).not.toContain('aria-label="Search"');
  const index = await request.get("/", { headers: { host: "value.gigainvestors.com" } });
  expect(await index.text()).not.toContain('aria-label="Search"');
  const sitemap = await request.get("/sitemap.xml", { headers: { host: "value.gigainvestors.com" } });
  expect(await sitemap.text()).toContain("https://value.gigainvestors.com/ko.us");
  const main = await request.get("/sitemap.xml");
  expect(await main.text()).not.toContain("https://value.gigainvestors.com");
});

test("global search is omitted on value routes and retained on the main site", async ({ page }) => {
  for (const url of ["/value", "/value/ko.us"]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Search", exact: true })).toHaveCount(0);
    await page.keyboard.press("/");
    await expect(page.getByPlaceholder("investor, firm, ticker, company")).toHaveCount(0);
  }
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByPlaceholder("investor, firm, ticker, company")).toBeVisible();
});
