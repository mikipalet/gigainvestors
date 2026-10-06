// Test-only review scenario. The production manifest is deliberately unchanged.
// The real invariant still checks exact before/after tuples and every country.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=process.env.PUBFIX_ROOT;
if(!root||process.env.VALUE_CORPUS_DIR!==root+'/corpus')throw Error('Isolated corpus required');
const proposals=JSON.parse(fs.readFileSync(path.join(__dirname,'../proposed-verdict-changes.json'),'utf8'));
const original=Module._load;
let recorded=false;
Module._load=function(id,...args){
 const result=original.call(this,id,...args);
 if(/(?:^|\/)approved-verdict-changes\.json$/.test(id)){
  if(!recorded){fs.appendFileSync(root+'/evidence/boundaries.jsonl',JSON.stringify({kind:'proposed-approval-scenario',alreadyApproved:result.map(r=>r.id),proposed:proposals.map(r=>r.id)})+'\n');recorded=true;}
  return [...result,...proposals];
 }
 return result;
};
