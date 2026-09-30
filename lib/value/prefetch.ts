type Connection = {saveData?:boolean;effectiveType?:string};
export function canPrefetch(connection?:Connection) {
 return !connection?.saveData&&!['slow-2g','2g','3g'].includes(connection?.effectiveType??'');
}
/** Background work runs only after a quiet period and an idle browser turn. */
export function onValueIdle(work:()=>void,delay=1200) {
 let idle:number|undefined;
 const timer=setTimeout(()=>{
  if(!canPrefetch((navigator as Navigator&{connection?:Connection}).connection))return;
  if('requestIdleCallback' in window)idle=window.requestIdleCallback(work);
  else work();
 },delay);
 return()=>{clearTimeout(timer);if(idle!==undefined)window.cancelIdleCallback(idle);};
}
