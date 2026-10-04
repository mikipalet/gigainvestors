// Browser-side audit: report inaccessible clipping, not content reachable by scrolling.
module.exports = function geometry(){
 const hiddenCuts=[];const seen=new Set();
 const auditRoot=document.querySelector('dialog[open],[role=dialog]')??document.body;
 const visuallyHidden=el=>{for(let p=el;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(s.clipPath==='inset(50%)'||s.clip==='rect(0px, 0px, 0px, 0px)')return true;}return false;};
 const walker=document.createTreeWalker(auditRoot,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode,e=node.parentElement;if(!e||!node.textContent.trim()||!e.checkVisibility({visibilityProperty:true,opacityProperty:true}))continue;
  if(e.closest('.sr-only,[aria-hidden=true],.tile,.viz-tooltip,nextjs-portal')||visuallyHidden(e))continue;
  const r=e.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight)continue;
  const range=document.createRange();range.selectNodeContents(node);
  for(const rect of range.getClientRects()){
   if(!rect.width||!rect.height||rect.bottom<0||rect.top>innerHeight)continue;
   for(let parent=e;parent&&parent!==document.body;parent=parent.parentElement){
    const s=getComputedStyle(parent),b=parent.getBoundingClientRect();
    if(s.display==='none'||s.visibility==='hidden')break;
    const cutX=['hidden','clip'].includes(s.overflowX)&&(rect.left<b.left-2||rect.right>b.right+2);
    const cutY=['hidden','clip'].includes(s.overflowY)&&(rect.top<b.top-2||rect.bottom>b.bottom+2);
    if(cutX||cutY){
     const text=node.textContent.trim().slice(0,100),key=text+'|'+parent.className;
     if(!seen.has(key)){seen.add(key);hiddenCuts.push({text,tag:e.tagName,clippedBy:parent.className,axis:cutX?'x':'y'});}
     break;
    }
    // Scrollable containers expose content by scrolling and are not inaccessible cuts.
    if(parent.matches('dialog[open]')||['auto','scroll'].includes(s.overflowY)&&parent.scrollHeight>parent.clientHeight+1)break;
   }
  }
 }
 const dock=document.querySelector('.site-dock,.shared-dock');
 const dockBox=dock?.getBoundingClientRect();
 const controls=dock?[...dock.querySelectorAll('.dock-tools > a,.dock-tools > button')].map(e=>({text:e.textContent.trim(),rect:e.getBoundingClientRect()})):[];
 const overlaps=[];
 for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=controls[i],b=controls[j];if(Math.min(a.rect.right,b.rect.right)>Math.max(a.rect.left,b.rect.left)+.5&&Math.min(a.rect.bottom,b.rect.bottom)>Math.max(a.rect.top,b.rect.top)+.5)overlaps.push([a.text,b.text]);}
 const locked=document.querySelector('.legacy-investor .locks-scroll,.one-index.locks-scroll,.company-page');
 const content=locked?.getBoundingClientRect();
 return {hiddenCuts,overlaps,dockContentOverlap:!!(dockBox&&content&&content.bottom>dockBox.top+1),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
};
