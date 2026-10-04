// node --env-file=$HOME/value-corpus/.env.local --import tsx scripts/protection/upload-blob.ts <snapshot> <report.json>
import {writeFileSync} from 'node:fs';
import {uploadPublishedSnapshot} from '../value/blob-publish';
async function main(){
 const [repo,report]=process.argv.slice(2);if(!repo||!report)throw new Error('Expected snapshot and report paths');
 writeFileSync(report,JSON.stringify(await uploadPublishedSnapshot(repo),null,2));
}
main().catch(()=>{console.error('Private Blob upload failed; current pointer was not advanced unless all files completed.');process.exitCode=1;});
