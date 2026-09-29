import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function valueFixtures(page:Page) {
 await page.route('https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/**',async route=>{
  const file=new URL(route.request().url()).pathname.split('/main/')[1];
  try{await route.fulfill({contentType:'application/json',body:await readFile(path.resolve('tests/fixtures/value/store',file),'utf8')});}catch{await route.fulfill({status:404,body:'{}'});}
 });
 await page.route('https://icons.duckduckgo.com/ip3/**',async route=>{
  const file=new URL(route.request().url()).pathname.split('/').at(-1)!;
  try{await route.fulfill({contentType:'image/x-icon',body:await readFile(path.resolve('tests/fixtures/value/logos',file))});}catch{await route.fulfill({status:404,body:''});}
 });
}
