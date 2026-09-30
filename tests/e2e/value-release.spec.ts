import { test, expect } from '@playwright/test';

test.skip(!process.env.RELEASE_QA, 'Run against the release staging store.');

test('all mobile buy pages fit, preserve ranks and expose every staged pick', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?markets=all', { waitUntil: 'networkidle' });
  const total = Number(await page.locator('.one-index').getAttribute('data-buy-count'));
  const ids = new Set<string>();
  let rank = 1;
  for (;;) {
    const cards = page.locator('.buy-tile');
    for (const card of await cards.all()) {
      expect(Number(await card.getAttribute('data-rank'))).toBe(rank);
      await expect(card).toHaveAttribute('data-priority', String(rank === 1));
      ids.add((await card.getAttribute('href'))!);
      rank++;
    }
    const grid = await page.locator('.buy-grid').boundingBox();
    const waiting = await page.locator('.waiting-zone').boundingBox();
    expect(grid!.y + grid!.height).toBeLessThan(700);
    expect(waiting!.y + waiting!.height).toBeLessThanOrEqual(797);
    const next = page.getByRole('button', { name: 'Next buy-zone companies' });
    if (!await next.count() || await next.isDisabled()) break;
    await next.click();
  }
  expect(ids.size).toBe(total);
});

test('a held valuation explains verification rather than asking for a lower price', async ({ page }) => {
  await page.goto('/infy.us', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('verdict')).toContainText('Verify valuation');
  await expect(page.getByTestId('verdict')).not.toContainText('Wait for a better price');
});

for (const [width, height] of [[1728, 970], [2056, 1180]]) {
  test(`filtered company names and value labels fit their tiles at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/?country=PL', { waitUntil: 'networkidle' });
    const clipped = await page.locator('.company-tile').evaluateAll(tiles => tiles.flatMap(tile => {
      const bounds = tile.getBoundingClientRect();
      return [...tile.querySelectorAll('strong,.map-price,.map-verdict')].flatMap(el => {
        const range = document.createRange(); range.selectNodeContents(el);
        return [...range.getClientRects()].some(r => r.left < bounds.left - 1 || r.right > bounds.right + 1 || r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1) ? [el.textContent] : [];
      });
    }));
    expect(clipped).toEqual([]);
  });
}
