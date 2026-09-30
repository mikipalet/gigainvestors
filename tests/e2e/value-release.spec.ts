import { expect,test } from '@playwright/test';

test.skip(!process.env.RELEASE_QA, 'Run against the release staging store.');

test('a held valuation stays outside the buy zone without internal status wording', async ({ page }) => {
  await page.goto('/uri.us', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('verdict')).toContainText('Valuation unavailable');
  await expect(page.getByTestId('verdict')).not.toContainText('Wait for a better price');
});
