// The public Euronext page ships the AES formatter/passphrase used by its AJAX tables.
// Decode the same public response the browser displays; no authentication is used.
import {createHash,createDecipheriv} from 'node:crypto';
import {writeFileSync,statfsSync} from 'node:fs';
const [instrument,destination]=process.argv.slice(2);
if(!/^[A-Z]{2}[A-Z0-9]{10}-[A-Z0-9]{4}$/.test(instrument??'')||!destination)throw new Error('Usage: euronext-components.mjs ISIN-MIC DESTINATION.html');
const disk=statfsSync('/');if(disk.bavail*disk.bsize<5e9)throw new Error('Disk below 5 GB; stopping');
async function get(url){const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`Euronext HTTP ${response.status}`);return response;}
const url=`https://live.euronext.com/en/product/indices/${instrument}/market-information`;
const page=await (await get(url)).text();
const settingsText=page.match(/<script type="application\/json" data-drupal-selector="drupal-settings-json">([\s\S]*?)<\/script>/)?.[1];
if(!settingsText)throw new Error('Euronext public table settings missing');
const settings=JSON.parse(settingsText),pass=settings.ajax_secure?.kye;
if(!pass)throw new Error('Euronext public table formatter missing');
const response=await (await get(`https://live.euronext.com/en/ajax/getIndexCompositionFull/${instrument}`)).json();
let prior=Buffer.alloc(0),derived=Buffer.alloc(0);const salt=Buffer.from(response.s,'hex');
while(derived.length<48){prior=createHash('md5').update(Buffer.concat([prior,Buffer.from(pass),salt])).digest();derived=Buffer.concat([derived,prior]);}
const cipher=createDecipheriv('aes-256-cbc',derived.subarray(0,32),Buffer.from(response.iv,'hex'));
const html=JSON.parse(Buffer.concat([cipher.update(Buffer.from(response.ct,'base64')),cipher.final()]).toString());
writeFileSync(destination,html);console.log(instrument,html.length);
