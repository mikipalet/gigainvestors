import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import {PathnameContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import {LayoutRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {BottomBarShell} from '../../components/BottomBarShell';

vi.stubGlobal('React',React);

// Vercel can prerender the home document with /index as its canonical URL.
// The selected route tree is the same on the server and in the browser.
function render(pathname:string,segments:string[]) {
 let tree:any=['__PAGE__',{}];
 for(const segment of [...segments].reverse())tree=[segment,{children:tree}];
 const context={parentTree:['',{children:tree}]} as any;
 return renderToStaticMarkup(React.createElement(PathnameContext.Provider,{value:pathname},React.createElement(LayoutRouterContext.Provider,{value:context},React.createElement(BottomBarShell,{investorCodes:['HA','BRK'],timelineCodes:['HA','BRK'],method:React.createElement('button',null,'Method')}))));
}

describe('dock hydration',()=>{
 it('renders the same home markup for the prerender URL and browser URL',()=>{
  const server=render('/index',[]),client=render('/',[]);
  expect(server).toBe(client);
  expect(server).toContain('data-timeline="true"');
  expect(server).not.toContain('>GigaInvestors<');
 });
 it.each([
  ['/value',['value'],true],['/value?q=2018Q3',['value','quarter','2018Q3'],true],['/value/year/2018',['value','year','2018'],true],
  ['/s/AAPL',['s','AAPL'],false],['/s/KO',['s','KO'],false],
  ['/HA',['HA'],true],['/BRK',['BRK'],true],
  ['/about',['about'],false],['/newsletter',['newsletter'],false],['/value/method',['value','method'],false],
 ] as [string,string[],boolean][])('keeps one site dock and the timeline slot on %s',(path,segments,timeline)=>{
  const html=render(path,segments);
  expect(html).toContain('site-dock');
  expect(html).toContain(`data-timeline="${timeline}"`);
 });
 it('sends the GigaValue button to today, never a time-travel quarter',()=>{
  expect(render('/HA',['HA'])).toContain('<a href="/value">GigaValue</a>');
  expect(render('/s/AAPL',['s','AAPL'])).toContain('<a href="/value">GigaValue</a>');
 });
});
