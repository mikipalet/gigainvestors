import { importIndia } from '../../lib/value/india/importer';

const args=process.argv.slice(2);
if(args.some(a=>a!=='--dry-run'&&a!=='--force'&&!a.startsWith('--only=')))throw new Error('Expected --dry-run, --force, or --only=ID,ID');
importIndia({only:args.find(a=>a.startsWith('--only='))?.slice(7).split(','),write:!args.includes('--dry-run'),force:args.includes('--force')}).catch(e=>{console.error(e);process.exitCode=1;});
