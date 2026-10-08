import { expect, test } from '@playwright/test';

test.describe('device regression review', () => {
  test('iPad portrait company dossier keeps inline quality and price charts visible', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/s/GOOGL', { waitUntil: 'networkidle' });

    await expect(page.locator('.one-dossier')).toBeVisible();
    await expect(page.locator('.quality-section .mini-series svg')).toHaveCount(4);
    await expect(page.locator('.quality-section .mini-dollar svg')).toHaveCount(1);
    await expect(page.locator('.price-section .mini-price svg')).toBeVisible();

    const chartBoxes = await page.locator('.quality-section .mini-series svg, .quality-section .mini-dollar svg, .price-section .mini-price svg').evaluateAll(nodes =>
      nodes.map(node => {
        const rect = (node as SVGElement).getBoundingClientRect();
        const figure = node.closest('figure')!;
        return { width: rect.width, height: rect.height, visible: getComputedStyle(figure).visibility !== 'hidden' && rect.width > 0 && rect.height > 0 };
      }),
    );
    expect(chartBoxes.every(box => box.visible && box.width >= 120 && box.height >= 40)).toBe(true);
  });

  test('desktop value page shows a full next-closest grid and the time-travel slider', async ({ page }) => {
    await page.setViewportSize({ width: 1728, height: 970 });
    await page.goto('/value', { waitUntil: 'networkidle' });

    await expect(page.locator('.main-view')).toBeVisible();
    await expect(page.locator('.main-next-row').first()).toBeVisible();
    await expect.poll(async () => page.locator('.main-next-row').count()).toBeGreaterThanOrEqual(20);
    await expect(page.getByRole('slider')).toBeVisible();

    const rows = await page.locator('.shelf-near-grid').evaluate(el => getComputedStyle(el).gridTemplateRows.split(' ').length);
    expect(rows).toBeGreaterThanOrEqual(4);
  });

  test('phone company dossier uses the spare space for the price chart before the dock', async ({ page }) => {
    for (const [width, height, minimumChart] of [[390, 844, 100], [375, 667, 56]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto('/s/GOOGL', { waitUntil: 'networkidle' });

      await expect(page.locator('.one-dossier')).toBeVisible();
      await expect(page.locator('.price-section .mini-price svg')).toBeVisible();

      const geometry = await page.evaluate(() => {
        const chart = document.querySelector('.price-section .mini-price svg')!.getBoundingClientRect();
        const dock = document.querySelector('.site-dock')!.getBoundingClientRect();
        return { chartHeight: chart.height, chartBottom: chart.bottom, dockTop: dock.top };
      });
      expect(geometry.chartHeight).toBeGreaterThanOrEqual(minimumChart);
      expect(geometry.chartBottom).toBeLessThanOrEqual(geometry.dockTop - 8);
    }
  });

  test('next-closest grid follows its container when the window shrinks and grows', async ({ page }) => {
    await page.setViewportSize({ width: 1728, height: 970 });
    await page.goto('/value', { waitUntil: 'networkidle' });
    await expect.poll(async () => page.locator('.main-next-row').count()).toBe(20);
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect.poll(async () => page.locator('.main-next-row').count()).toBe(6);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(async () => page.locator('.main-next-row').count()).toBe(16);
  });
});

test.describe('device regression review on touch', () => {
  test.use({ hasTouch: true });

  test('iPad widths below the desktop filter row can open the filters', async ({ page }) => {
    for (const [width, height] of [[768, 1024], [820, 1180], [1024, 768]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto('/value', { waitUntil: 'networkidle' });
      const button = page.locator('.map-toolbar .shared-filter-button');
      await expect(button).toBeVisible();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await button.tap();
      await expect(page.locator('.panel-filters')).toBeVisible();
    }
  });
});
