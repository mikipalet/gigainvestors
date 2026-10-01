import {statfsSync} from 'node:fs';
/** The round uses the stricter owner threshold. Called before each download/batch. */
export function businessDiskGuard(){const d=statfsSync('/');if(d.bavail*d.bsize<6*1024**3)throw Error('DISK STOP: below 6 GiB');}
