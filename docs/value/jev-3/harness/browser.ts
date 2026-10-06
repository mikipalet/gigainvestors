import {chromium,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {shardOf} from '../../../../lib/value/shard';
import {verifyPublication} from '../../../../scripts/value/post-publish';
import {assertPublishInvariants} from '../../../../scripts/value/publish-invariants';
import {checkTimeTravel} from '../../../../scripts/value/live-check';
const root=process.env.PUBFIX_ROOT!,repo=process.env.VALUE_STORE_DIR??root+'/corpus/publish-repo';
async function main(){
 const browser=await chromium.launch({headless:true});const results=[];
 try{
 for(const id of process.env.JEV_TIME_TRAVEL_ONLY?[]:['ALSN.US','FDJU.PA','FCN.US','ELV.US','LOG.MC','PRDO.US','PLUS.LSE']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto('http://127.0.0.1:3189/value/'+id.toLowerCase(),{waitUntil:'networkidle'});
  const expected=JSON.parse(readFileSync(`${repo}/dossiers/${shardOf(id)}.json`,'utf8'))[id];
  const api=await page.request.get(`http://127.0.0.1:3189/api/value/data/dossiers/${shardOf(id)}.json`);
  const actual=(await api.json())[id];
  expect(actual.valuation).toEqual(expected.valuation);expect(actual.b).toBe(false);
  const priceLabel=['ELV.US','LOG.MC','PRDO.US'].includes(id)?'Fail':'Wait';
  await expect(page.getByTestId('tile-price').locator('header > span').last()).toHaveText(priceLabel);
  const body=await page.locator('body').innerText();
  writeFileSync(`${root}/evidence/${id}-page.txt`,body);
  await page.screenshot({path:`${root}/evidence/${id}.png`,fullPage:true});
  expect(response?.status()).toBe(200);expect(errors).toEqual([]);
  expect(body).toContain(id.split('.')[0]);
  const priceTile=await page.getByTestId('tile-price').innerText();
  await page.getByRole('button',{name:'Open valuation',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:`${root}/evidence/${id}-valuation.png`,fullPage:true});
  results.push({id,priceLabel,priceTile,status:response?.status(),apiStatus:api.status(),buy:actual.b,perShare:actual.valuation.perShare.mid,requiredMos:actual.requiredMos,balance:actual.valuation.balanceSheet,pageErrors:errors,dialogOpened:true});
  await page.close();
 }
 const history=JSON.parse(readFileSync(`${repo}/history/index.json`,'utf8'));
 const timePage=await browser.newPage({viewport:{width:1440,height:900}}),timeErrors:string[]=[];
 timePage.on('pageerror',error=>timeErrors.push(error.message));
 await checkTimeTravel(timePage,history,'http://127.0.0.1:3189/value');
 expect(timeErrors).toEqual([]);
 await timePage.screenshot({path:root+'/evidence/2018Q3.png'});
 assertPublishInvariants(repo,JSON.parse(readFileSync(root+'/evidence/setup.json','utf8')).sourceHead);
 await verifyPublication(repo,{check:async()=>{const receipt=JSON.parse(readFileSync(`${repo}/.git/value-publish-pending.json`,'utf8'));assertPublishInvariants(repo,receipt.before);}});
 const name=process.env.JEV_TIME_TRAVEL_ONLY?'time-travel':'browser';
 writeFileSync(root+`/evidence/${name}.json`,JSON.stringify({passed:true,pages:results,timeTravel:{latest:history.quarters.at(-1),deepLink:'2018Q3',pageErrors:timeErrors}},null,2)+'\n');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
