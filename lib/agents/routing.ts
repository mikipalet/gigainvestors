/** Public Markdown paths are stable; /md is the internal representation namespace. */
export function markdownRoute(path: string, valueHost: boolean, accept: string): string|null {
 const isMarkdown=path.endsWith('.md');
 if(!isMarkdown&&!accept.includes('text/markdown'))return null;
 if(/^\/(?:api|md|mcp|_next)(?:\/|$)/.test(path)||/\.(?:txt|xml|json)$/.test(path))return null;
 let p=isMarkdown?path.slice(0,-3):path;
 p=p.replace(/\/index$/,'')||'/';
 if(p==='/search')return '/md/search';
 if(valueHost||p==='/value'||p.startsWith('/value/')){
  if(p.startsWith('/value'))p=p.slice(6)||'/';
  return `/md/value${p==='/'?'':p}`;
 }
 if(p==='/')return '/md/home';
 if(/^\/s\/[^/]+$/.test(p))return `/md${p}`;
 if(/^\/(?:munger|newsletter)$/.test(p))return `/md${p}`;
 if(/^\/(?:about|privacy)$/.test(p))return `/md/page${p}`;
 if(/^\/newsletter\/[^/]+$/.test(p))return `/md/issue${p.slice(11)}`;
 if(/^\/[A-Za-z]{1,8}$/.test(p))return `/md/i${p}`;
 return null;
}
