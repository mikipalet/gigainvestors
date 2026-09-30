import { expect, test } from '@playwright/test';

test.skip(!process.env.ITALY_RELEASE_QA, 'Run against the release-2 staging store.');
for (const [width,height] of [[1728,970],[2056,1180],[390,844]]) {
  test(`Italian search and Western access at ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width,height});
    await page.goto('/',{waitUntil:'networkidle'});
    await expect(page.locator('.buy-tile[href="/amb.war"]')).toBeVisible();
    await expect(page.locator('.buy-tile[href="/tghn.xetra"]')).toHaveCount(0);
    for (const [query,id] of [['Ferrari','RACE.MI'],['ENI','ENI.MI']]) {
      await page.evaluate(id=>window.dispatchEvent(new CustomEvent('open-search',{detail:id})),query);
      const option=page.getByRole('option').filter({hasText:id});
      await expect(option).toBeVisible();
      await expect(option).not.toContainText('not easily buyable');
      await page.keyboard.press('Escape');
    }
  });
  test(`Logwin return hurdle and Italian filing history at ${width}x${height}`,async ({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/tghn.xetra',{waitUntil:'networkidle'});
    await expect(page.getByTestId('verdict')).toContainText('Close to the buy price, but the expected return is under the 10% hurdle.');
    await expect(page.getByTestId('verdict')).not.toContainText('Buy zone');
    await expect(page.locator('.plain-verdict')).toHaveCSS('background-color','rgb(236, 231, 216)');
    for(const id of ['race.mi','eni.mi']) {
      await page.goto('/'+id,{waitUntil:'networkidle'});
      await expect(page.getByTestId('verdict')).toContainText('Only 7 years of filings; the checklist needs 10');
      await expect(page.locator('.company-heading p')).toHaveAttribute('title',/on Milan/);
    }
    await page.goto('/amb.war',{waitUntil:'networkidle'});
    await expect(page.getByTestId('verdict')).toContainText('Buy zone');
  });
}
