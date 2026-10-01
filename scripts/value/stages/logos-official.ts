import logos from './logos';
/** Compatibility entry point: all sources now share validation and same-origin assets. */
export default async function official(options:{only?:string[];limit?:number;force?:boolean}={}){
 return logos(options);
}
