/** Use the original description: cached `about` text can already end in an ellipsis. */
export function descriptionSentence(description?: string | null, about?: string | null): string {
 const source=(description?.trim() || about?.trim() || '').replace(/\s+/g,' ').replace(/,\s+together with [^,]+,/gi,'');
 if(!source)return '';
 // A sentence boundary requires an uppercase next word; protect company suffixes.
 const protectedText=source.replace(/\b(N\.V\.|S\.A\.|S\.p\.A\.|Inc\.|Ltd\.|Corp\.)/g,m=>m.replaceAll('.','∯'));
 const sentences=protectedText.match(/.*?[.!?](?=\s+[A-Z]|$)|.+$/g)??[protectedText];
 let sentence=sentences[0].replaceAll('∯','.').trim();
 if(sentence.length<85&&sentences[1])sentence+=' '+sentences[1].replaceAll('∯','.').trim();
 if(sentence.length>180||/[.…]{3}|…/.test(sentence)){
  const prefix=sentence.replace(/\s+(?:in the|in|across|through|including|which|with|as well as)\s+[^.!?]*[.…]*$/i,'');
  if(prefix.length>=45&&prefix.length<sentence.length)sentence=prefix;
  else {const clauses=sentence.split(/;|,\s+(?:and|including|which|with)\s+/);if(clauses[0].length>=45)sentence=clauses[0];}
 }
 return sentence.replace(/[\s,;:.…]+$/,'')+'.';
}
