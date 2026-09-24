import type { VersePart } from "./api";
/** One whitespace stream for both text and styled parts. No word guessing. */
export function normalizeSourceParts(input:VersePart[]):VersePart[]{
  const output:VersePart[]=[];let text="";let pendingSpace:Extract<VersePart,{kind:"text"}>|undefined;
  const append=(part:Extract<VersePart,{kind:"text"}>,value:string)=>{if(!value)return;const last=output.at(-1);if(last?.kind==="text"&&last.style===part.style&&last.isJesus===part.isJesus)last.text+=value;else output.push({...part,text:value});text+=value;};
  for(const part of input){
    if(part.kind!=="text"){output.push({...part});continue;}
    if(part.style==="divine"&&/^Lord\b/.test(part.text)&&/\bthe$/.test(text)&&!pendingSpace)pendingSpace={...part,text:" "};
    const sourceText=part.text.replace(/#\s*[—–−-]\s*#/g,"—");
    for(const ch of sourceText){if(/\s/u.test(ch)){if(text)pendingSpace=part;continue;}if(pendingSpace&&!/[,.;:!?”’]/u.test(ch))append(pendingSpace," ");pendingSpace=undefined;append(part,ch);}
  }
  return output;
}
