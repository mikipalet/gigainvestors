// Test fixtures use os.homedir()/value-corpus instead of TMPDIR. Redirect that
// API only in unit-test child processes; never permit writes to the live corpus.
const os=require('node:os'),fs=require('node:fs');
const testHome='/Users/miki/data/value-rules/.audit/rules-2/tmp/unit-home';
fs.mkdirSync(testHome,{recursive:true});
os.homedir=()=>testHome;
require('node:module').syncBuiltinESMExports();
