// Allow mocked provider calls and local browser fixtures; deny real outbound sockets.
// No credential, URL query, or process arguments are logged.
const net = require('node:net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let options = args[0];
  if (Array.isArray(options)) options = options[0];
  const host = typeof options === 'object' ? options.host : typeof args[1] === 'string' ? args[1] : undefined;
  if (host && !['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)) throw new Error('Unit test outbound networking denied');
  return connect.apply(this, args);
};
const tls = require('node:tls');
const tlsConnect = tls.connect;
tls.connect = function (...args) {
  const options = args.find(x => x && typeof x === 'object');
  const host = options?.servername || options?.host;
  if (host && !['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Unit test outbound TLS denied');
  return tlsConnect.apply(this, args);
};
// Existing tests once placed fixtures under the real corpus. Fail closed on any
// mutation there, including temporary-directory creation, independently of env.
const fs = require('node:fs');
const path = require('node:path');
const live = path.join(require('node:os').homedir(), 'value-corpus');
function guard(p) {
  if (typeof p !== 'string' && !Buffer.isBuffer(p) && !(p instanceof URL)) return;
  const target = path.resolve(p instanceof URL ? require('node:url').fileURLToPath(p) : String(p));
  if (target === live || target.startsWith(live + path.sep)) throw new Error('Read-only live corpus mutation denied');
}
for (const name of ['writeFile','appendFile','mkdir','mkdtemp','rm','rmdir','unlink','truncate','chmod','chown','utimes']) {
  for (const suffix of ['', 'Sync']) {
    const key = name + suffix, original = fs[key];
    if (original) fs[key] = function (p, ...args) { guard(p); return original.call(this, p, ...args); };
  }
  const original = fs.promises[name];
  if (original) fs.promises[name] = function(p, ...args) { guard(p); return original.call(this, p, ...args); };
}
for (const name of ['rename','copyFile','link','symlink']) for (const suffix of ['', 'Sync']) {
  const key=name+suffix, original=fs[key];
  if (original) fs[key]=function(a,b,...args) { if(name==='rename')guard(a);guard(b);return original.call(this,a,b,...args); };
}
for (const key of ['open','openSync']) {
  const original=fs[key];fs[key]=function(p,flags,...args) { if(typeof flags==='number' ? (flags & 3)!==0 || flags & fs.constants.O_CREAT : /[wa+]/.test(flags))guard(p);return original.call(this,p,flags,...args); };
}
require('node:module').syncBuiltinESMExports();
