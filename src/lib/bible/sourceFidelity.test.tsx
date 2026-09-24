import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parsePassageHtml } from "./parsePassageHtml";
import { splitJesusSpeechForChapter } from "./redLetter";
import { versePlainText } from "./verseParts";
/** Independent browser DOM walk, not the production tokenizer. */
function originalSource(html:string){
  const doc=new DOMParser().parseFromString(html,"text/html"),result=new Map<number,{text:string;red:boolean[]}>();let verse:number|undefined;
  const ignore=new Set(["f","fe","x","xt","xo","fr","ft","fqa","fq","fk","sup","xop","xot","xnt"]);
  const add=(value:string,red:boolean)=>{if(!verse)return;const item=result.get(verse)??{text:"",red:[]};item.text+=value;item.red.push(...Array.from(value).map(()=>red));result.set(verse,item);};
  const walk=(node:Node,red=false)=>{if(node.nodeType===Node.TEXT_NODE){add(node.textContent??"",red);return;}if(!(node instanceof Element))return;if(["SCRIPT","STYLE","NOTE","FIGURE","TEMPLATE"].includes(node.tagName))return;if([...node.classList].some(c=>ignore.has(c)))return;if(node.classList.contains("v")){verse=Number(node.getAttribute("data-number")||node.textContent);return;}if(node.tagName==="BR"){add(" ",red);return;}for(const child of node.childNodes)walk(child,red||node.classList.contains("wj"));};
  for(const p of doc.querySelectorAll("p")){if([...p.classList].some(c=>/^(s\d*|ms\d*|d|qa|r|mr|sr|mt\d*|c|cp|cl|ca|b)$/.test(c)))continue;add(" ",false);walk(p);}return result;
}
const significant=(text:string)=>text.replace(/#\s*[—–−-]\s*#/g,"—").toLowerCase().replace(/\s+/gu,"");
const dir=join(process.cwd(),"src/lib/bible/fixtures/golden");
describe("original source text and speech, no provider requests",()=>{
  for(const file of readdirSync(dir).filter(n=>n.endsWith('.html')))it('preserves complete source and speech '+file,()=>{
    const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Provider blocked'));
    try{
      const html=readFileSync(join(dir,file),'utf8'),expected=originalSource(html),parsed=parsePassageHtml(html);
      expect(parsed.verses.map(v=>v.number)).toEqual([...expected.keys()]);
      const book=file.split('-')[1],chapter=Number(file.split('-')[2].split('.')[0]),red=splitJesusSpeechForChapter(book,chapter,parsed.verses);
      for(const v of parsed.verses){const source=expected.get(v.number)!;expect(significant(versePlainText(v)),file+':'+v.number).toBe(significant(source.text));expect(v.text).toBe(versePlainText(v));
        const sourceFlags=Array.from(source.text).map((ch,i)=>({ch,red:source.red[i]})).filter(({ch})=>/[\p{L}\p{N}]/u.test(ch)).map(s=>s.red);
        const actualFlags=red.get(v.number)!.flatMap(s=>Array.from(s.text).map(ch=>({ch,red:s.isJesus}))).filter(({ch})=>/[\p{L}\p{N}]/u.test(ch)).map(s=>s.red);
        expect(actualFlags,'publisher wj '+file+':'+v.number).toEqual(sourceFlags);
      }expect(network).not.toHaveBeenCalled();
    }finally{network.mockRestore();}
  });
});
