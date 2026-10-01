import dotenv from 'dotenv';
import {askJev} from '../../lib/value/jev/client';
import {selectShortText} from '../../lib/value/judgement/short-text';
import {writeFileSync} from 'node:fs';
dotenv.config({path:'.env.local',quiet:true});dotenv.config({path:'/Users/miki/value-corpus/.env.local',quiet:true});
const cases=[
 ['The company repurchased shares during the year.','Repurchases its own shares.',true],
 ['We sell phones, computers and tablets to consumers and business customers.','Sells phones, computers and tablets to consumers and businesses.',true],
 ['We depend on a single supplier for the key component.','Relies on a single supplier for a key component.',true],
 ['Our brands have strong consumer recognition and loyalty.','Its brands have strong consumer recognition and loyalty.',true],
 ['Capital expenditures were $90 billion and depreciation was $20 billion.','Capital spending exceeds depreciation.',true],
 ['Our digital marketing tools serve advertisers, agencies and publishers.','Provides advertising tools to advertisers, agencies and publishers.',true],
 ['Demand may decline if competitors launch better products.','Demand has declined.',false],
 ['No customer represents more than 10% of our revenue.','A single customer accounts for most sales.',false],
 ['We sell phones and tablets.','Sells phones, tablets and aircraft.',false],
 ['We expect to consider repurchases next year.','Repurchases its own shares.',false],
 ['Revenue increased while sales volume decreased.','Higher prices have held up alongside demand.',false],
 ['We offer a wide range of products.','Customers cannot switch to competitors.',false],
] as const;
async function main(){const results=[];for(const [quote,sentence,expected]of cases){const recordings:unknown[]=[];const answer=await selectShortText({quote,url:'https://example.com/calibration',section:'test',filed:'2026-10-01'},[sentence],async input=>{const result=await askJev({...input,usageFile:'business-fit/usage.jsonl'});recordings.push({...input,...result});return result;});results.push({quote,sentence,expected,accepted:!!answer,answer,recordings});}writeFileSync('tests/fixtures/value/judgement/short-text-calibration.json',JSON.stringify(results,null,2)+'\n');console.log(results.map(r=>({sentence:r.sentence,expected:r.expected,accepted:r.accepted})));if(results.some(r=>r.accepted!==r.expected))process.exitCode=1;}
main().catch(e=>{console.error(e.message);process.exitCode=1});
