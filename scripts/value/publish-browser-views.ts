/** Re-publish only browser contracts in an existing local staging directory. */
import {readFileSync,readdirSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import path from 'node:path';
import {publishViews} from '../../lib/value/publish-views';
const directory=path.resolve(process.argv[2]??'');
if(!directory.includes('/staging/'))throw new Error('Pass an existing local staging directory; remote publication is unsupported');
const files:Record<string,unknown>={'meta.json':JSON.parse(readFileSync(path.join(directory,'meta.json'),'utf8'))};
for(const folder of ['index','history','prices','dossiers'])for(const file of readdirSync(path.join(directory,folder)).filter(f=>f.endsWith('.json')))files[`${folder}/${file}`]=JSON.parse(readFileSync(path.join(directory,folder,file),'utf8'));
const manifest=publishViews(files);
mkdirSync(path.join(directory,'views'),{recursive:true});
for(const [file,data] of Object.entries(files))if(file.startsWith('views/'))writeFileSync(path.join(directory,file),JSON.stringify(data)+'\n');
// The manifest becomes visible only after every referenced payload exists.
writeFileSync(path.join(directory,'meta.json.tmp'),JSON.stringify(files['meta.json'])+'\n');
renameSync(path.join(directory,'meta.json.tmp'),path.join(directory,'meta.json'));
console.log(JSON.stringify(manifest,null,2));
