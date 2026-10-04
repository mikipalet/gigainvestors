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
 return renderToStaticMarkup(React.createElement(PathnameContext.Provider,{value:pathname},React.createElement(LayoutRouterContext.Provider,{value:context},React.createElement(BottomBarShell,{quarters:['2026Q1','2026Q2'],investorCodes:['HA','BRK'],method:React.createElement('button',null,'Method')}))));
}

describe('dock hydration',()=>{
 it('renders the same home markup for the prerender URL and browser URL',()=>{
  const server=render('/index',[]),client=render('/',[]);
  expect(server).toBe(client);
  expect(server).not.toContain('house-timeline');
 });
 it.each([
  ['/value',['value'],false],['/value/year/2018',['value','year','2018'],false],
  ['/s/AAPL',['s','AAPL'],false],['/s/KO',['s','KO'],false],
  ['/HA',['HA'],false],['/BRK',['BRK'],false],
  ['/about',['about'],true],['/newsletter',['newsletter'],true],['/value/method',['value','method'],true],
 ] as [string,string[],boolean][])('keeps the timeline ownership on %s',(path,segments,defaultTimeline)=>{
  const html=render(path,segments);
  expect(html.includes('house-timeline')).toBe(defaultTimeline);
  expect(html.includes('shared-dock')).toBe(!['/HA','/BRK'].includes(path));
 });
});
