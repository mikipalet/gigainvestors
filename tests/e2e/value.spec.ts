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
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Buffett’s quality tests");
  await expect(page.getByRole("row", { name: /Coca-Cola/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Delta Air/ })).toHaveCount(0);
  await page.getByRole("switch", {name:/Near misses/}).click();
  await expect(page.getByRole("row", { name: /Delta Air/ })).toBeVisible();
  const names = await page.getByTestId('results-table').locator('tbody tr').allTextContents();
  expect(names.findIndex(name => name.includes('Coca-Cola'))).toBeLessThan(names.findIndex(name => name.includes('Delta Air')));
  await expect(page.getByRole("row", { name: /Coca-Cola/ })).toContainText("0.60×");
  await page.getByLabel("Country", {exact:true}).click();
  await page.getByRole("button", {name:"United States",exact:true}).click();
  await expect(page.getByRole("row", { name: /Sparse/ })).toHaveClass(/insufficient/);
  await expect(page).toHaveURL(/country=US/);
  await page.reload();
  await expect(page.getByRole("switch", {name:/Near misses/})).toBeChecked();
  await page.getByRole("button", { name: /Company/ }).click();
  await expect(page.getByTestId("results-table").locator("tbody tr").first()).toContainText("Abbott");
});

test("dossier sections, evidence, bridge and price", async ({ page }) => {
  await page.goto("/value/ko.us");
  await expect(page.locator(".test-section > header h2")).toHaveText([
    "Understandable", "Moat", "Economics", "Management", "Accounting",
  ]);
  await page.locator(".bridge-disclosure > summary").click();
  await page.getByText("Show as table", { exact: true }).click();
  await expect(page.getByTestId("valuation-bridge").locator("tbody tr").last()).toContainText("Per-share value");
  await expect(page.getByTestId("valuation-bridge").locator("tbody tr").last()).toContainText("36.78");
  await expect(page.getByTestId("football-field")).toContainText("40.0% below our mid estimate");
  await expect(page.locator('section[data-test="price"]')).toContainText("pass");
  await page.locator('[data-test="moat"] details').filter({ hasText: 'Report evidence' }).locator('summary').click();
  await expect(page.getByText("Our brands encourage repeat purchases.")).toHaveCount(0);
  await expect(page.getByText("Item 1 · Business").first()).toBeVisible();
  await expect(page.getByText(/10-K FY2025 · filed 20 Feb 2026/)).toBeVisible();
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
  await page.getByRole("switch", {name:"Held by superinvestors"}).click();
  await expect(page.getByTestId("results-table").locator("tbody tr")).toHaveCount(1);
  await page.getByRole("switch", {name:"Held by superinvestors"}).click();
  await page.locator(".signal-filter > summary").click();
  await page.getByRole("button", { name: "Brand advantage" }).click();
  await expect(page.getByTestId("results-table").locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Brand advantage" }).click();
  await page.getByRole("button",{name:"Sector",exact:true}).click();
  await page.getByRole("button",{name:"Industrials",exact:true}).click();
  await expect(page.getByRole("row", { name: /Coca-Cola/ })).toHaveCount(0);
});

test("limits the table and expands without losing sorting", async ({ page }) => {
  const rows = JSON.parse(await readFile(path.join(root, "index/US.json"), "utf8"));
  await page.route("**/main/index/US.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(Array.from({ length: 205 }, (_, index) => ({ ...rows[0], id: `FIX${index}.US`, n: `Company ${String(index).padStart(3, "0")}` }))) }));
  await page.goto("/value?country=US&sort=name&direction=asc");
  await expect(page.getByTestId("results-table").locator("[data-company-row]")).toHaveCount(50);
  await page.getByRole("button", { name: "Show more" }).click();
  await expect(page.getByTestId("results-table")).toHaveAttribute("aria-rowcount", "206");
  await page.getByTestId("results-scroll").evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(page.getByTestId("results-table").locator("[data-company-row]")).toHaveCount(50);
  await expect(page.getByTestId("results-table").locator("[data-company-row]").last()).toContainText("Company 204");
});

test("subdomain rewrites dotted company IDs and its own sitemap", async ({ request }) => {
  const response = await request.get("/ko.us", { headers: { host: "value.gigainvestors.com" } });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Coca-Cola");
  expect(await response.text()).toContain('aria-label="Search companies"');
  const index = await request.get("/", { headers: { host: "value.gigainvestors.com" } });
  expect(await index.text()).toContain('aria-label="Search companies"');
  const sitemap = await request.get("/sitemap.xml", { headers: { host: "value.gigainvestors.com" } });
  expect(await sitemap.text()).toContain("https://value.gigainvestors.com/ko.us");
  const main = await request.get("/sitemap.xml");
  expect(await main.text()).not.toContain("https://value.gigainvestors.com");
});

test("shared search is available on value routes and retained on the main site", async ({ page }) => {
  for (const url of ["/value", "/value/ko.us"]) {
    await page.goto(url, {waitUntil:"networkidle"});
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Search companies", exact: true }).first()).toBeVisible();
    await page.keyboard.press("/");
    await expect(page.getByPlaceholder("investor, firm, ticker, company")).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByPlaceholder("investor, firm, ticker, company")).toBeVisible();
});

test('phone table, default toggle, readable metrics and relevant series', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/value');
  await page.locator('.filter-panel > summary').click();
  await expect(page.getByRole('switch', {name:/Near misses/})).not.toBeChecked();
  await expect(page.getByRole('columnheader', { name: 'Country', exact: true })).not.toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Holders', exact: true })).not.toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Market cap/ })).not.toBeVisible();
  await expect(page.getByTestId('results-table').locator('tbody tr').first().locator('[title="Moat: pass"]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.getByTestId('results-table').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.goto('/value/ko.us');
  await expect(page.locator('[data-test="moat"]')).toContainText('ROIC, 10-year median');
  await expect(page.locator('[data-test="moat"]')).toContainText('24.5%');
  await expect(page.locator('[data-test="understandable"] [data-testid="threshold-series"] svg')).toHaveCount(3);
  await expect(page.getByRole('group', { name: 'Diluted shares fiscal years' })).toBeVisible();
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
  await page.getByLabel("Country", {exact:true}).click();
  await page.getByRole("button", {name:"United States",exact:true}).click();
  await expect(page.getByText('Could not load this country.', { exact: false })).toBeVisible();
  await expect(page.getByText('Loading companies…')).toHaveCount(0);
});

test('football field and threshold series expose focus tooltips and table twins', async ({ page }) => {
  await page.goto('/value/ko.us');
  const field = page.getByTestId('football-field');
  await field.locator('[tabindex="0"]').first().focus();
  await expect(field.getByRole('tooltip')).toContainText('buy below');
  await field.getByText('Show data', { exact: true }).click();
  await expect(field.getByRole('table')).toContainText('36.78');
  const chart = page.getByTestId('threshold-series').filter({ has: page.getByRole('heading', { name: /^Median/ }) });
  await chart.getByRole('button').first().focus();
  await page.keyboard.press('End');
  await expect(chart.getByRole('tooltip')).toContainText('FY2025');
  await page.keyboard.press('ArrowLeft');
  await expect(chart.getByRole('tooltip')).toContainText('FY2024');
  await chart.getByText('Show data', { exact: true }).click();
  await expect(chart.getByRole('table')).toContainText('28.0%');
});

test('bank, currency mismatch and missing-price dossiers keep distinct methods and states', async ({ page }) => {
  await page.goto('/value/jpm.us');
  await expect(page.getByTestId('football-field')).toContainText('Book value');
  await page.locator('.bridge-disclosure > summary').click();
  await expect(page.getByRole('heading', { name: 'Book value bridge' })).toBeVisible();
  await expect(page.locator('[data-test="moat"]')).toContainText('Return on tangible equity');
  await page.goto('/value/fx.us');
  await expect(page.getByTestId('football-field')).toContainText('Price is in USD, value in EUR, not compared');
  await expect(page.getByTestId('football-field').locator('[aria-label^="Price "]')).toHaveCount(0);
  await expect(page.locator('[data-test="price"]')).toContainText('unclear');
  await page.goto('/value/sparse.us');
  await expect(page.getByTestId('verdict')).toContainText('Comparable price or valuation unavailable');
});

test('funnel applies cumulative gates and strip points open dossiers', async ({ page }) => {
  await page.goto('/value?country=US');
  await page.getByRole('button', { name: /^Analysed/ }).click();
  await expect(page.getByTestId('results-table').locator('tbody tr')).toHaveCount(41);
  await page.getByRole('button', { name: /^At buy price/ }).click();
  await expect(page.getByRole('row', { name: /Delta Air/ })).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Coca-Cola/ })).toBeVisible();
  const point = page.getByRole('group', { name: 'Shortlisted companies by price to value', exact: true }).getByRole('link', { name: /^Coca-Cola/ });
  await point.focus();
  await expect(page.locator('figure[aria-labelledby="strip-title"]').getByRole('tooltip')).toContainText('Coca-Cola');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/value\/ko.us$/);
});


test('research charts expose structural navigation, persistent tips, events and log gaps', async ({ page }) => {
  await page.goto('/value/ko.us');
  const chart = page.getByTestId('threshold-series').filter({ has: page.getByRole('heading', { name: /^Median/ }) });
  await expect(chart.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(chart.locator('figcaption')).toContainText('lowest year');
  await chart.getByRole('button').first().focus();
  await page.keyboard.press('End');
  await expect(chart.locator('[aria-live="polite"]')).toContainText('FY2025');
  await page.mouse.move(0, 0);
  await expect(chart.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(chart.getByRole('tooltip')).toContainText('FY2016');
  await page.keyboard.press('Escape');
  await expect(chart.getByRole('tooltip')).toHaveCount(0);
  await page.mouse.move(0, 0);
  await chart.getByRole('group', { name: 'ROIC fiscal years' }).hover({ position: { x: 120, y: 60 } });
  await chart.getByRole('tooltip').hover();
  await expect(chart.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(chart.getByRole('tooltip')).toHaveCount(0);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(chart.getByRole('tooltip')).toContainText('Acquisition added assets');
  await expect(page.getByTestId('price-history')).toContainText('months with an estimate');
  await expect(page.getByTestId('football-field')).toContainText('last fiscal year FY2025');
  await page.goto('/value/oxy.us');
  await expect(page.getByTestId('football-field')).toContainText('50% below mid, earnings are volatile');
  const earnings = page.getByTestId('threshold-series').filter({ hasText: 'Owner earnings per share' }).first();
  await expect(earnings).not.toContainText('log scale');
  await expect(earnings.locator('svg')).toBeVisible();
  await page.goto('/value/fx.us');
  await expect(page.getByTestId('price-history')).toHaveCount(0);
});

test('touch pins a tooltip and phone waterfall has its table first', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/value/ko.us');
  const field = page.getByTestId('football-field');
  await field.getByRole('button').first().tap();
  await page.getByRole('heading', { name: 'Coca-Cola', exact: true }).tap();
  await expect(field.getByRole('tooltip')).toBeVisible();
  await field.getByRole('button').first().focus();
  await page.keyboard.press('Escape');
  await expect(field.getByRole('tooltip')).toHaveCount(0);
  await page.locator('.bridge-disclosure > summary').click();
  const bridge = page.getByTestId('valuation-bridge');
  const table = await bridge.locator('details').boundingBox(), chart = await bridge.locator('figure').boundingBox();
  expect(table!.y).toBeLessThan(chart!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await context.close();
});

test('large country indexes preserve the global shortlist plot and virtualise the table', async ({ page }) => {
  const row = JSON.parse(await readFile(path.join(root, 'index/US.json'), 'utf8'))[0];
  const rows = Array.from({ length: 1501 }, (_, i) => ({ ...row, id: `LARGE${i}.US`, n: `Large ${i}`, t: 'PPPPP' }));
  const prices = Object.fromEntries(rows.map((r, i) => [r.id, [r.v[1] * (.5 + i/1501), '2026-09-28']]));
  await page.route('**/main/index/US.json', route => route.fulfill({ json: rows }));
  await page.route('**/main/prices/US.json', route => route.fulfill({ json: prices }));
  await page.goto('/value?country=US');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Shortlisted companies by price to value', exact: true }).getByRole('link')).toHaveCount(0);
  await expect(page.locator('[data-company-row]')).toHaveCount(50);
});

test('seeded index prices and current moat rules have explicit labels', async ({ page }) => {
  const prices = JSON.parse(await readFile(path.join(root, 'prices/US.json'), 'utf8'));
  prices['KO.US'] = [prices['KO.US'][0], '2026-09-28', 'seed'];
  await page.route('**/main/prices/US.json', route => route.fulfill({ json: prices }));
  await page.goto('/value');
  await expect(page.locator('.table-caption')).toContainText('Includes estimates from market capitalisation');
  await expect(page.getByRole('row', { name: /Coca-Cola/ }).locator('.price-col')).toHaveAttribute('title', /Price derived from market cap 28 Sep 2026/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/value/ko.us');
  await expect(page.locator('[data-test="moat"]')).toContainText('Gross margin change, FY2023 vs FY2019–20');
  await expect(page.locator('[data-test="moat"]')).toContainText('At least -4.0 pp');
  const history = page.getByTestId('price-history');
  await history.getByText('Show value data', { exact: true }).click();
  await expect(history.getByRole('table', { name: 'Fiscal-year value ranges' })).toBeVisible();
  await history.getByText('Show price data', { exact: true }).click();
  await expect(history.getByRole('table', { name: 'Monthly closing prices' })).toBeVisible();
});

test('dossier reload uses the latest client quote without rebuilding', async ({ page }) => {
  const prices = JSON.parse(await readFile(path.join(root, 'prices/US.json'), 'utf8'));
  const original = prices['KO.US'][0];
  await page.route('**/main/prices/US.json', route => route.fulfill({ json: prices }));
  await page.goto('/value/ko.us');
  await expect(page.getByTestId('football-field')).toContainText('40.0% below our mid estimate');
  prices['KO.US'] = [original / 2, '2026-09-29'];
  await page.reload();
  await expect(page.getByTestId('football-field')).toContainText('70.0% below our mid estimate');
  await expect(page.getByTestId('price-history')).toContainText("Buy line uses today's required discount for every year.");
});

test('zero index midpoints do not produce infinite margins', async ({ page }) => {
  const rows = JSON.parse(await readFile(path.join(root, 'index/US.json'), 'utf8'));
  for (const row of rows) if (row.id === 'KO.US') row.v = [0, 0, 0];
  await page.route('**/main/index/US.json', route => route.fulfill({ json: rows }));
  await page.goto('/value?country=US');
  await expect(page.getByRole('row', { name: /Coca-Cola/ })).toContainText('n/v');
  await expect(page.locator('body')).not.toContainText('Infinity');
});

test('robots and value sitemap respect the value host', async ({ request }) => {
  for (const host of ['value.gigainvestors.com', 'gigainvestors.com']) {
    const robots = await request.get('/robots.txt', { headers: { host } });
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain(`Sitemap: https://${host}/sitemap.xml`);
  }
  const sitemap = await request.get('/sitemap.xml', { headers: { host: 'value.gigainvestors.com' } });
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('https://value.gigainvestors.com/ko.us');
  for (const id of ['bad', 'a'.repeat(25) + '.us']) {
    expect((await request.get(`/value/${id}`)).status()).toBe(404);
  }
});


test('verdict leads the dossier and wide data areas use the viewport', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/value/ko.us');
  const verdict = await page.getByTestId('verdict').boundingBox();
  const valuation = await page.getByTestId('football-field').boundingBox();
  expect(verdict!.y + verdict!.height).toBeLessThanOrEqual(valuation!.y);
  expect(valuation!.y + valuation!.height).toBeLessThan(900);
  expect(await page.getByTestId('price-history').evaluate(el => el.getBoundingClientRect().width / innerWidth)).toBeGreaterThanOrEqual(.85);
  await page.locator('.section-nav a[href="#test-moat"]').click();
  await expect(page).toHaveURL(/#test-moat$/);
});

test('company search and mobile filters are usable', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/value');
  await expect(page.getByTestId('results-table')).toBeVisible();
  await page.locator('.filter-panel > summary').click();
  await page.keyboard.press('/');
  await page.getByPlaceholder('investor, firm, ticker, company').fill('Coca');
  await page.getByRole('button',{name:'Filter this list: Coca'}).click();
  await expect(page.locator('[data-company-row]')).toHaveCount(1);
  await page.keyboard.press('/');
  await page.getByPlaceholder('investor, firm, ticker, company').fill('coca');
  await expect(page.getByRole('option').first()).toContainText('KO.US');
  await page.getByPlaceholder('investor, firm, ticker, company').press('Enter');
  await expect(page).toHaveURL(/\/value\/ko.us$/);
});

test('one palette searches names, aliases and pending companies',async({page})=>{
 await page.goto('/value');
 for(const [query,code] of [['coca','KO.US'],['tsm','TSM.US'],['nestle','NESN.SW'],['0700','0700.HK']]){
  await page.keyboard.press('Control+k');
  const input=page.getByPlaceholder('investor, firm, ticker, company');
  await input.fill(query);await expect(page.getByRole('option').first()).toContainText(code);
  await input.press('ArrowDown');await input.press('ArrowUp');
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected','true');
  if(query==='0700'){await input.press('Enter');await expect(page.getByRole('heading',{name:'Not analysed yet'})).toBeVisible();}
  else await input.press('Escape');
 }
});
