import {expect,it} from 'vitest';
import {brandCandidates,robotsAllowed,localLogoFiles} from '@/lib/value/logo-discovery';
it('finds header brands, local home links and inline SVG without customer logos',()=>{
 const html='<header><img alt="Issuer" src="/brand.png"><svg class="logo" viewBox="0 0 80 80"><path d="M0 0h80v80H0z"/></svg></header><nav><a href="/ja/"><img src="/logo.svg"></a></nav><main><img src="/customer-logo.png"></main>';
 const c=brandCandidates(html,'https://issuer.test/','Issuer');
 expect(c.map(x=>x.url)).toContain('https://issuer.test/brand.png');
 expect(c.some(x=>x.inline?.includes('<path'))).toBe(true);
 expect(c.map(x=>x.url)).not.toContain('https://issuer.test/customer-logo.png');
});
it('honors longest robots rules, groups and wildcard end anchors',()=>{
 const text='User-agent: *\nDisallow: /private\nAllow: /private/logo\nDisallow: /*.pdf$\nUser-agent: OtherBot\nDisallow: /';
 expect(robotsAllowed(text,'https://issuer.test/private/a')).toBe(false);
 expect(robotsAllowed(text,'https://issuer.test/private/logo.png')).toBe(true);
 expect(robotsAllowed(text,'https://issuer.test/report.pdf')).toBe(false);
 expect(robotsAllowed(text,'https://issuer.test/')).toBe(true);
 expect(robotsAllowed('User-agent: GigaInvestorsLogoBot\nDisallow: /\nUser-agent: *\nAllow: /','https://issuer.test/')).toBe(false);
});
it('extracts local infobox logo fields without treating a headquarters image as a logo',()=>{
 expect(localLogoFiles('{{会社情報\n|ロゴ = [[ファイル:Issuer.svg|200px]]\n|画像 = Headquarters.jpg\n}}')).toEqual(['Issuer.svg']);
 expect(localLogoFiles('{{Infobox\n|logo = Issuer logo.png\n|image = Tower.jpg\n}}')).toEqual(['Issuer logo.png']);
});
it('recognizes logo containers when an inline SVG has no own class',()=>{
 expect(brandCandidates('<header><a class="logo" href="/en"><svg viewBox="0 0 80 80"><path d="M0 0h80v80H0z"/></svg></a></header>','https://issuer.test/','Issuer').some(c=>c.inline)).toBe(true);
});
it('preserves SVG viewBox and clipPath spelling so serialized header marks render',async()=>{
 const {validLogo}=await import('@/lib/value/logo-validation');
 const [c]=brandCandidates('<header><svg class="logo" viewBox="0 0 100 80"><defs><clipPath id="clip"><rect width="100" height="80"/></clipPath></defs><path clip-path="url(#clip)" d="M0 0h100v80H0z"/></svg></header>','https://issuer.test/','Issuer');
 expect(c.inline).toContain('viewBox="0 0 100 80"');
 expect(c.inline).toContain('<clipPath');
 expect(await validLogo(Buffer.from(c.inline!))).toBe(true);
});
it('never inherits issuer identity from body classes into product banners, flags or social icons',()=>{
 const html='<body class="issuer"><header><a href="/"><img src="/real-logo.svg"></a><img src="/flags/gb.svg"><a class="social" href="https://linkedin.com"><img src="/linkedin-logo.svg"></a></header><main><img src="/banner.jpg"><div class="brands"><img src="/product.png"></div></main></body>';
 expect(brandCandidates(html,'https://issuer.test/','Issuer').map(c=>c.url)).toEqual(['https://issuer.test/real-logo.svg']);
});
it('finds a header title background logo without accepting brand-gallery decorations',async()=>{
 const {cssBrandCandidates}=await import('@/lib/value/logo-discovery');
 const c=cssBrandCandidates('.l-header__title a{background-image:url(../img/logo.svg)} .brand-item{background:url(pattern.png)}','https://issuer.test/css/main.css','https://issuer.test/');
 expect(c.map(x=>x.url)).toEqual(['https://issuer.test/img/logo.svg']);
});
it('resolves the selected external SVG sprite symbol rather than rendering the whole sprite',async()=>{
 const {svgSymbol}=await import('@/lib/value/logo-discovery');
 const sprite='<svg><symbol id="wrong" viewBox="0 0 1 1"><circle r="1"/></symbol><symbol id="logo" viewBox="0 0 100 40"><path d="M0 0h100v40H0z"/></symbol></svg>';
 expect(svgSymbol(sprite,'logo')).toContain('viewBox="0 0 100 40"');
 expect(svgSymbol(sprite,'logo')).not.toContain('<circle');
 expect(svgSymbol(sprite,'missing')).toBeNull();
});
it('checks destination robots before following a website redirect',async()=>{
 const {robotsRequest}=await import('@/lib/value/logo-discovery');const seen:string[]=[];
 const request:typeof fetch=async input=>{const u=String(input);seen.push(u);if(u==='https://a.test/robots.txt')return new Response('',{status:404});if(u==='https://b.test/robots.txt')return new Response('User-agent: *\nDisallow: /');return new Response(null,{status:302,headers:{location:'https://b.test/private'}});};
 await expect(robotsRequest(request,[])('https://a.test/')).rejects.toThrow('robots');
 expect(seen).not.toContain('https://b.test/private');
});
it('reads legacy Chinese company_logo and Spanish logotipo infobox fields',()=>{
 expect(localLogoFiles('{{Infobox company\n|company_logo=[[File:Issuer.svg|150px]]\n|logotipo=Marca.png\n}}')).toEqual(['Issuer.svg','Marca.png']);
});

it('does not merge an empty disallow group into the next bot group',()=>{
 expect(robotsAllowed('User-agent: *\nDisallow:\nUser-agent: OtherBot\nDisallow: /','https://issuer.test/logo.png')).toBe(true);
});
