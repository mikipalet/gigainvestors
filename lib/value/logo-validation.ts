import {createHash} from 'node:crypto';
import sharp from 'sharp';
export const iconHash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export async function validLogo(bytes:Uint8Array,defaultHash?:string):Promise<boolean> {
 if(defaultHash&&iconHash(bytes)===defaultHash)return false;
 // ICO directory contains every embedded size (zero denotes 256px).
 if(bytes[0]===0&&bytes[1]===0&&bytes[2]===1&&bytes[3]===0){
  const count=bytes[4]+bytes[5]*256;
  if(!count||bytes.length<6+count*16)return false;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let i=6;i<6+count*16;i+=16){
   const width=bytes[i]||256,height=bytes[i+1]||256,size=view.getUint32(i+8,true),offset=view.getUint32(i+12,true);
   if(width<32||height<32||offset<6+count*16||offset+size>bytes.length||size<40)continue;
   const payload=bytes.slice(offset,offset+size);
   try{const m=await sharp(payload).metadata();if((m.width??0)>=32&&(m.height??0)>=32)return true;}catch{}
   // Legacy ICO bitmap: a valid DIB header and enough pixel data for the declared dimensions.
   const dib=new DataView(payload.buffer,payload.byteOffset,payload.byteLength),header=dib.getUint32(0,true),bits=dib.getUint16(14,true);
   if(header>=40&&header<=size&&dib.getInt32(4,true)===width&&Math.abs(dib.getInt32(8,true))===height*2&&[1,4,8,16,24,32].includes(bits)&&size>=header+Math.ceil(width*bits/32)*4*height)return true;
  }
  return false;
 }
 try{const m=await sharp(bytes).metadata();return (m.width??0)>=32&&(m.height??0)>=32;}catch{return false;}
}
