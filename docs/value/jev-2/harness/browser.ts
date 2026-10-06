import {chromium,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {shardOf} from '../../../../lib/value/shard';
import {verifyPublication} from '../../../../scripts/value/post-publish';
import {assertPublishInvariants} from '../../../../scripts/value/publish-invariants';
const root=process.env.PUBFIX_ROOT!,repo=process.env.VALUE_STORE_DIR??root+'/corpus/publish-repo';
async function main(){
 const browser=await chromium.launch({headless:true});const results=[];
 try{
 for(const id of ['ALSN.US','FDJU.PA']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto('http://127.0.0.1:3189/value/'+id.toLowerCase(),{waitUntil:'networkidle'});
  const expected=JSON.parse(readFileSync(`${repo}/dossiers/${shardOf(id)}.json`,'utf8'))[id];
  const api=await page.request.get(`http://127.0.0.1:3189/api/value/data/dossiers/${shardOf(id)}.json`);
  const actual=(await api.json())[id];
  expect(actual.valuation).toEqual(expected.valuation);expect(actual.b).toBe(false);
  await expect(page.getByTestId('tile-price')).toContainText('Wait');
  const body=await page.locator('body').innerText();
  writeFileSync(`${root}/evidence/${id}-page.txt`,body);
  await page.screenshot({path:`${root}/evidence/${id}.png`,fullPage:true});
  expect(response?.status()).toBe(200);expect(errors).toEqual([]);
  expect(body).toContain(id.split('.')[0]);
  const priceTile=await page.getByTestId('tile-price').innerText();
  await page.getByRole('button',{name:'Open valuation',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:`${root}/evidence/${id}-valuation.png`,fullPage:true});
  results.push({id,priceTile,status:response?.status(),apiStatus:api.status(),buy:actual.b,perShare:actual.valuation.perShare.mid,requiredMos:actual.requiredMos,balance:actual.valuation.balanceSheet,pageErrors:errors});
  await page.close();
 }
 await verifyPublication(repo,{check:async()=>{const receipt=JSON.parse(readFileSync(`${repo}/.git/value-publish-pending.json`,'utf8'));assertPublishInvariants(repo,receipt.before);}});
 writeFileSync(root+'/evidence/browser.json',JSON.stringify({passed:true,pages:results},null,2)+'\n');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
