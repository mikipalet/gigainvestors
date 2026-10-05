import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {verifyPublication} from '../../../../scripts/value/post-publish';
import {assertPublishInvariants} from '../../../../scripts/value/publish-invariants';
const repo=path.join(process.env.VALUE_CORPUS_DIR!,'publish-repo');
verifyPublication(repo,{check:async repo=>{
 assertPublishInvariants(repo);
 const meta=JSON.parse(readFileSync(path.join(repo,'meta.json'),'utf8'));
 if(!meta.views.quarters['2018Q3']||!existsSync(path.join(repo,meta.views.quarters['2018Q3'])))throw Error('Missing historical view');
}}).catch(error=>{console.error(error.message);process.exitCode=1;});
