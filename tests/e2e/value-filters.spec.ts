import {expect,test} from '@playwright/test';

test.skip(process.env.VALUE_FILTERS !== '1', 'Requires the local release-data server.');

test('country choices scroll, keep reset pinned, and support search and keyboard selection', async ({page}) => {
  await page.goto('/', {waitUntil:'networkidle'});
  const trigger=page.getByRole('combobox',{name:'Country',exact:true});
  await trigger.click();
  const list=page.getByRole('listbox',{name:'Country',exact:true});
  expect(await list.getByRole('option').count()).toBeGreaterThan(10);
  const scroller=list.locator('.filter-scroll');
  expect(await scroller.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  await scroller.evaluate(el=>el.scrollTop=el.scrollHeight);
  await expect(list.getByRole('option').first()).toBeInViewport();
  await expect(list.getByRole('option').last()).toBeInViewport();
  await expect(page.getByRole('navigation',{name:'Country pages'})).toHaveCount(0);
  const search=page.getByRole('combobox',{name:'Search Country',exact:true});
  await expect(search).toHaveAttribute('placeholder','Search');
  await search.fill('united');
  await expect(list.getByRole('option').first()).toContainText('All countries');
  await expect(list.getByRole('option').filter({hasText:'United States'})).toBeVisible();
  await search.press('Enter');
  await expect(trigger).toContainText('United Kingdom');
  await expect(trigger).toBeFocused();
  await trigger.press('u');
  await expect(search).toHaveValue('u');
  await search.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await search.fill('no such country');
  await expect(page.getByRole('status').filter({hasText:'No matches'})).toBeVisible();
  await list.getByRole('option').first().click();
  await expect(trigger).toContainText('All countries');
  await trigger.click();
  await search.press('End');
  await search.press('Enter');
  await expect(trigger).toContainText('United States');
  await trigger.click();
  await expect(list.getByRole('option',{selected:true})).toBeInViewport();
  await page.locator('.index-story').click();
  await expect(list).toHaveCount(0);
});

test('phone has inline countries and sectors, persistent action, and all three switches', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/', {waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  const sheet=page.getByRole('dialog',{name:'Filter companies'});
  await expect(sheet.getByRole('listbox',{name:'Countries',exact:true})).toBeVisible();
  await expect(sheet.getByRole('listbox',{name:'Sectors',exact:true})).toBeAttached();
  await expect(sheet.locator('button[aria-haspopup=listbox]')).toHaveCount(0);
  const sectors=sheet.getByRole('listbox',{name:'Sectors',exact:true});
  await sectors.focus();
  await sectors.press('End');
  await expect(sectors.getByRole('option').last()).toBeInViewport();
  const search=sheet.getByRole('combobox',{name:'Search Countries'});
  await search.fill('united');
  await sheet.getByRole('option').filter({hasText:'United States'}).click();
  await expect(sheet).toBeVisible();
  await sectors.focus();
  await sectors.pressSequentially('tech');
  await sectors.press('Enter');
  await expect(sectors.getByRole('option').filter({hasText:'Technology'})).toHaveAttribute('aria-selected','true');
  for(const name of ['Near misses','Held by superinvestors','Western markets']) {
    const toggle=sheet.getByRole('switch',{name});
    await toggle.scrollIntoViewIfNeeded();
    const before=await toggle.getAttribute('aria-checked');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked',before==='true'?'false':'true');
  }
  const apply=sheet.getByRole('button',{name:/Show \d+ companies/});
  await expect(apply).toBeInViewport();
  await apply.click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Filters',exact:true})).toBeFocused();
});
