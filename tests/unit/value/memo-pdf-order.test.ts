import {it,expect,vi} from 'vitest';
import {fetchDocument} from '../../../lib/value/thesis/sources';
/** Minimal two-column filing page, entirely in memory. */
function twoColumns(){
 const stream='BT /F1 12 Tf 72 700 Td (Pricing contribution was) Tj 0 -16 Td (2.8% for the group.) Tj 0 -16 Td (Volumes grew 0.8%.) Tj ET BT /F1 12 Tf 330 700 Td (The value gap fell) Tj 0 -16 Td (by 60% in 2025.) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});const start=Buffer.byteLength(pdf);
 pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
 return pdf;
}
it('business reading order keeps the pricing number beside its own words across PDF columns',async()=>{
 vi.stubGlobal('fetch',async()=>new Response(twoColumns()));
 try{
  const legacy=(await fetchDocument('https://issuer.test/annual.pdf')).replace(/\s+/g,' ');
  const prose=(await fetchDocument('https://issuer.test/annual.pdf',0,false)).replace(/\s+/g,' ');
  expect(legacy).not.toContain('Pricing contribution was 2.8% for the group.');
  expect(prose).toContain('Pricing contribution was 2.8% for the group.');
  expect(prose).toContain('The value gap fell by 60% in 2025.');
 }finally{vi.unstubAllGlobals();}
});
