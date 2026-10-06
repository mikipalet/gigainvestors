// Run the existing release gate unchanged, with browser networking restricted to localhost.
import {chromium} from '@playwright/test';
const launch=chromium.launch.bind(chromium);
chromium.launch=async options=>{
 const browser=await launch(options),newPage=browser.newPage.bind(browser);
 browser.newPage=async options=>{
  const page=await newPage(options);
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  return page;
 };
 return browser;
};
await import('../../scripts/value/release-gate.mjs');
