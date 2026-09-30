import { expect,test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { HistoryIndex,IndexRow,StoreMeta } from '../../lib/value/types';

test.skip(!process.env.WESTERN_QA_STORE,'Run with a locally rebuilt live Western snapshot.');
const root=process.env.WESTERN_QA_STORE;
const meta=root?JSON.parse(readFileSync(`${root}/meta.json`,'utf8')) as StoreMeta:null;
const rows=root?JSON.parse(readFileSync(`${root}/index/default.json`,'utf8')) as IndexRow[]:[];
const history=root?JSON.parse(readFileSync(`${root}/history/index.json`,'utf8')) as HistoryIndex:null;
const out=process.env.WESTERN_QA_SHOTS??'/tmp/claude-1000/value-shots/western-1/final';

test('market toggle round-trip restores all aggregate and row populations',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 const toggle=page.getByRole('switch',{name:'Show all markets'});
 await toggle.click();await expect(page).toHaveURL(/markets=all/);
 await expect(page.locator('.one-index')).toHaveAttribute('data-analysed-count',String(meta!.story!.analysed));
 await page.reload({waitUntil:'networkidle'});
 await expect(toggle).toHaveAttribute('aria-checked','true');
 await toggle.click();await expect(page).not.toHaveURL(/markets=all/);
 await expect(page.locator('.one-index')).toHaveAttribute('data-analysed-count',String(meta!.western!.story.analysed));
 await page.getByRole('button',{name:'About the method ↗'}).click();
 await expect(page.getByRole('dialog').locator('.funnel')).toContainText(meta!.western!.funnel.analysed.toLocaleString());
});
test('global search finds and labels a Tokyo-only company from the default view',async({page})=>{
 await page.goto('/',{waitUntil:'networkidle'});
 await page.keyboard.press('Control+k');
 // Header shortcut is platform-independent through the search event.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('open-search',{detail:'6378'})));
 await expect(page.getByRole('option').filter({hasText:'6378.JP'})).toContainText('not easily buyable from Western brokers');
});

test('time travel switches Western and global historical populations together',async({page})=>{
 const year=history!.years[0];
 await page.goto(`/?year=${year}`,{waitUntil:'networkidle'});
 const western=history!.western!.perYear[year],global=history!.perYear[year];
 await expect(page.locator('.one-index')).toHaveAttribute('data-analysed-count',String(western.analysed));
 await expect(page.locator('.one-index')).toHaveAttribute('data-buy-count',String(western.atBuy));
 await page.getByRole('switch',{name:'Show all markets'}).click();
 await expect(page.locator('.one-index')).toHaveAttribute('data-analysed-count',String(global.analysed));
 await expect(page.locator('.one-index')).toHaveAttribute('data-buy-count',String(global.atBuy));
 await expect(page).toHaveURL(new RegExp(`year=${year}.*markets=all`));
});
