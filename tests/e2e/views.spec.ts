import { expect, test } from "@playwright/test";

test("homepage renders investors and scrubs", async ({ page }) => {
  await page.goto("/");
  const tiles = page.locator("a[href^='/']");
  await expect(tiles.first()).toBeVisible();
  const latest = await tiles.count();
  expect(latest).toBeGreaterThan(50);

  const slider = page.locator("input[type=range]");
  await slider.focus();
  await slider.press("Home");
  await page.waitForTimeout(600);
  const visibleEarly = await page.locator(".tile:not([style*='opacity: 0'])").count();
  expect(visibleEarly).toBeLessThan(latest);
});

test("investor page renders and scrubs", async ({ page }) => {
  await page.goto("/BRK");
  await expect(page.getByText("Warren Buffett")).toBeVisible();
  const aapl = page.locator(".tile", { hasText: "AAPL" }).first();
  await expect(aapl).toBeVisible();
  const before = await aapl.getAttribute("style");
  const slider = page.locator("input[type=range]");
  await slider.focus();
  await slider.press("ArrowLeft");
  await slider.press("ArrowLeft");
  await slider.press("ArrowLeft");
  await slider.press("ArrowLeft");
  await page.waitForTimeout(600);
  expect(await aapl.getAttribute("style")).not.toBe(before);
});

test("tile navigates to investor", async ({ page }) => {
  await page.goto("/");
  await page.locator("a[href^='/BRK']").first().click();
  await expect(page).toHaveURL(/\/BRK/);
});
