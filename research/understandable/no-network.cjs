// Import before the ordinary CLI. Local publication must use cached evidence only.
globalThis.fetch=async()=>{throw new Error('Understandable proof forbids network requests');};
for(const mod of ['node:http','node:https']){
 const api=require(mod);api.request=api.get=()=>{throw new Error('Understandable proof forbids network requests');};
}
