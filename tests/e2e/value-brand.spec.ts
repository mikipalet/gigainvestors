import { expect, test } from '@playwright/test';
import { VALUE_PRODUCT_NAME } from '../../lib/value/brand';

// Run against the production build on the value host (VALUE_SITE_HOST=localhost).
test.skip(!process.env.BRAND_QA, 'Run against the local branding release build.');

test('uses the shared brand in page, social metadata, search and method', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(`${VALUE_PRODUCT_NAME} | GigaInvestors`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', `${VALUE_PRODUCT_NAME} | GigaInvestors`);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', VALUE_PRODUCT_NAME);
  await page.getByRole('button', { name: 'Search companies', exact: true }).click();
  await page.locator('.search-modal input').fill('Wolters');
  await expect(page.locator('.search-group').first()).toHaveText(VALUE_PRODUCT_NAME);
  await page.keyboard.press('Escape');
  await page.goto('/ko.us');
  await expect(page).toHaveTitle(new RegExp(`: ${VALUE_PRODUCT_NAME}$`));
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /five quality tests plus a price check/);
  await page.goto('/method');
  await expect(page).toHaveTitle(`Method | ${VALUE_PRODUCT_NAME}`);
  await expect(page.locator('.method-page')).toContainText(`${VALUE_PRODUCT_NAME} assesses business quality`);
  await expect(page.locator('.method-page')).toContainText('not rules endorsed by them');
  await expect(page.locator('body')).not.toContainText('Buffett’s bar');
});

test('stock cross-link uses the dossier verdict and five tests plus a separate price check', async ({ page }) => {
  await page.goto('/ko.us');
  const verdict = await page.locator('.plain-verdict').innerText();
  const main = (process.env.BASE_URL ?? 'http://localhost:3000').replace('localhost', '127.0.0.1');
  await page.goto(`${main}/s/KO`);
  const link = page.locator('a[href="https://value.gigainvestors.com/ko.us"]');
  await expect(link).toHaveText(`${VALUE_PRODUCT_NAME}: ${verdict} →`);
  await expect(link).toHaveAttribute('title', /\d of 5 quality tests pass; price check: (passes|does not pass|unavailable)\./);
  await expect(page.locator('body')).not.toContainText('of 6');
  await page.goto(`${main}/BRK`);
  await expect(page).toHaveTitle(/Warren Buffett/);
});
