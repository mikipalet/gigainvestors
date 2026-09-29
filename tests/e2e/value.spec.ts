import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("tests/fixtures/value/store");

test.beforeEach(async ({ page }) => {
  await page.route("https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/**", async (route) => {
    const file = new URL(route.request().url()).pathname.split("/main/")[1];
    try {
      const body = file === "prices/US.json"
        ? await readFile(path.join(root, file), "utf8")
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
  const names = await page.getByTestId('results-table').locator('tbody tr').allTextContents();
  expect(names.findIndex(name => name.includes('Coca-Cola'))).toBeLessThan(names.findIndex(name => name.includes('Delta Air')));
  await expect(page.getByRole("row", { name: /Coca-Cola/ })).toContainText("40.0%");
  await page.getByLabel("Country", { exact: true }).selectOption("US");
  await expect(page.getByRole("row", { name: /Sparse Company/ })).toHaveClass(/opacity-40/);
  await expect(page).toHaveURL(/country=US/);
  await page.reload();
  await expect(page.getByLabel("Near misses")).toBeChecked();
  await page.getByRole("button", { name: "Name", exact: true }).click();
  await expect(page.getByTestId("results-table").locator("tbody tr").first()).toContainText("Abbott");
});

test("dossier sections, evidence, bridge and price", async ({ page }) => {
  await page.goto("/value/ko.us");
  await expect(page.locator("section[data-test] h2")).toHaveText([
    "Understandable", "Moat", "Economics", "Management", "Accounting", "Price",
  ]);
  await page.getByText("Show as table", { exact: true }).click();
  await expect(page.getByTestId("valuation-bridge").locator("tbody tr").last()).toContainText("Per-share value");
  await expect(page.getByTestId("valuation-bridge").locator("tbody tr").last()).toContainText("36.78");
  await expect(page.getByTestId("verdict")).toContainText("40.0% margin of safety");
  await expect(page.locator('section[data-test="price"]')).toContainText("pass");
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
  await expect(page.getByTestId("results-table").locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Held by superinvestors").uncheck();
  await page.getByRole("button", { name: "Brand advantage" }).click();
  await expect(page.getByTestId("results-table").locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Brand advantage" }).click();
  await page.getByLabel("Sector", { exact: true }).selectOption("Industrials");
  await expect(page.getByRole("row", { name: /Coca-Cola/ })).toHaveCount(0);
});

test("limits the table and expands without losing sorting", async ({ page }) => {
  const rows = JSON.parse(await readFile(path.join(root, "index/US.json"), "utf8"));
  await page.route("**/main/index/US.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(Array.from({ length: 205 }, (_, index) => ({ ...rows[0], id: `FIX${index}.US`, n: `Company ${String(index).padStart(3, "0")}` }))) }));
  await page.goto("/value?country=US&sort=name&direction=asc");
  await expect(page.getByTestId("results-table").locator("tbody tr")).toHaveCount(200);
  await page.getByRole("button", { name: "Show more" }).click();
  await expect(page.getByTestId("results-table").locator("tbody tr")).toHaveCount(205);
  await expect(page.getByTestId("results-table").locator("tbody tr").last()).toContainText("Company 204");
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

test('phone table, default toggle, readable metrics and relevant series', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/value');
  await expect(page.getByLabel('Near misses')).not.toBeChecked();
  await expect(page.getByRole('columnheader', { name: 'Country', exact: true })).not.toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Holders', exact: true })).not.toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Market cap (USD)' })).toBeVisible();
  await expect(page.getByTestId('results-table').locator('tbody tr').first().locator('[title="Moat: pass"]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.getByTestId('results-table').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.goto('/value/ko.us');
  await expect(page.locator('[data-test="moat"]')).toContainText('ROIC, 10-year median');
  await expect(page.locator('[data-test="moat"]')).toContainText('24.5%');
  await expect(page.locator('[data-test="understandable"] [data-testid="threshold-series"] svg')).toHaveCount(2);
  await expect(page.locator('[data-test="management"] [data-testid="threshold-series"] svg')).toHaveAttribute('aria-label', /Diluted shares, fiscal years 2016 to 2025/);
  await expect(page.locator('[data-test="price"]')).not.toContainText('Not reported');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('canonical lowercase redirects and clean host links', async ({ request }) => {
  for (const [url, host, expected] of [
    ['/value/KO.US?near=1', 'localhost:3000', '/value/ko.us?near=1'],
    ['/KO.US?near=1', 'value.gigainvestors.com', '/ko.us?near=1'],
  ]) {
    const response = await request.get(url, { headers: { host }, maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toContain(expected);
  }
  const response = await request.get('/', { headers: { host: 'value.gigainvestors.com' } });
  const html = await response.text();
  expect(html).toContain('href="/ko.us"');
  expect(html).not.toContain('href="/value/ko.us"');
});

test('country and price failures remain distinct', async ({ page }) => {
  await page.route('**/main/prices/US.json', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/value');
  await expect(page.getByText('Some prices are unavailable.', { exact: false })).toBeVisible();
  await page.route('**/main/index/US.json', route => route.fulfill({ status: 503, body: '{}' }));
  await page.getByLabel('Country', { exact: true }).selectOption('US');
  await expect(page.getByText('Could not load this country.', { exact: false })).toBeVisible();
  await expect(page.getByText('Loading companies…')).toHaveCount(0);
});

test('football field and threshold series expose focus tooltips and table twins', async ({ page }) => {
  await page.goto('/value/ko.us');
  const field = page.getByTestId('football-field');
  await field.locator('[tabindex="0"]').first().focus();
  await expect(field.getByRole('tooltip')).toContainText('Buy below');
  await field.getByText('Show data', { exact: true }).click();
  await expect(field.getByRole('table')).toContainText('36.78');
  const chart = page.getByTestId('threshold-series').filter({ has: page.getByRole('heading', { name: 'ROIC', exact: true }) });
  await chart.getByRole('img').focus();
  await expect(chart.getByRole('tooltip')).toContainText('FY2025');
  await page.keyboard.press('ArrowLeft');
  await expect(chart.getByRole('tooltip')).toContainText('FY2024');
  await chart.getByText('Show data', { exact: true }).click();
  await expect(chart.getByRole('table')).toContainText('28.0%');
});

test('bank, currency mismatch and missing-price dossiers keep distinct methods and states', async ({ page }) => {
  await page.goto('/value/jpm.us');
  await expect(page.getByTestId('football-field')).toContainText('Book value');
  await expect(page.getByRole('heading', { name: 'Book value bridge' })).toBeVisible();
  await expect(page.locator('[data-test="moat"]')).toContainText('Return on equity');
  await page.goto('/value/fx.us');
  await expect(page.getByTestId('football-field')).toContainText('Price is in USD, value in EUR, not compared');
  await expect(page.getByTestId('football-field').locator('[aria-label^="Price "]')).toHaveCount(0);
  await expect(page.locator('[data-test="price"]')).toContainText('unclear');
  await page.goto('/value/sparse.us');
  await expect(page.getByTestId('verdict')).toContainText('No price yet');
});

test('funnel applies cumulative gates and strip points open dossiers', async ({ page }) => {
  await page.goto('/value?country=US');
  await page.getByRole('button', { name: /^Analysed/ }).click();
  await expect(page.getByTestId('results-table').locator('tbody tr')).toHaveCount(41);
  await page.getByRole('button', { name: /^\+ Margin of safety/ }).click();
  await expect(page.getByRole('row', { name: /Delta Air/ })).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Coca-Cola/ })).toBeVisible();
  const point = page.locator('svg a').filter({ has: page.locator('title', { hasText: 'Coca-Cola' }) });
  await point.focus();
  await expect(page.getByRole('tooltip')).toContainText('Coca-Cola');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/value\/ko.us$/);
});
