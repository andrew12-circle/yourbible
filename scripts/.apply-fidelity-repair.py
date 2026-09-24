from pathlib import Path
import subprocess

ROOT = Path('.')
def put(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
def change(path, old, new, count=1):
    p = ROOT / path
    text = p.read_text()
    if old not in text:
        raise RuntimeError('Repair anchor missing: ' + path)
    p.write_text(text.replace(old, new, count))

# Apply only known transformations to the inspected main revision.
change('src/index.css', '    letter-spacing: 0.003em;', '    letter-spacing: inherit;')
change('src/index.css', '    padding: 0 0.05em;', '    padding: 0;')
change('src/lib/bible/textRevision.ts', '"v11"', '"v12-source-fidelity"')
change('src/lib/bible/readerStream.ts', 'READER_PAGINATOR_SPLIT_REVISION = 22', 'READER_PAGINATOR_SPLIT_REVISION = 23')
change('src/lib/bible/passageCache.test.ts', 'v11', 'v12-source-fidelity', 100)

put('src/lib/bible/sourceHtml.ts', '''/** Inert markup reader. Never inserts HTML into the DOM or fetches content. */
export type SourceNode = SourceElement | { kind: "text"; value: string };
export interface SourceElement {
  kind: "element"; tag: string; attrs: Record<string,string>; children: SourceNode[];
  start: number; openEnd: number; end: number; closeStart: number;
}
const VOID = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
const UNSAFE = new Set(["script","style","iframe","object","noscript","template","head"]);
export function sourceClasses(node: SourceElement): Set<string> { return new Set((node.attrs.class ?? node.attrs.style ?? "").split(/\\s+/).filter(Boolean)); }
export function sourceText(node: SourceNode): string { return node.kind === "text" ? node.value : UNSAFE.has(node.tag) ? "" : node.children.map(sourceText).join(""); }
export function decodeSourceEntities(text: string): string {
  const named: Record<string,string> = { amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",mdash:"—",ndash:"–",lsquo:"‘",rsquo:"’",ldquo:"“",rdquo:"”",hellip:"…",thinsp:" ",ensp:" ",emsp:" " };
  return text.replace(/&(#x[0-9a-f]+|#\\d+|[a-z]+);/gi, (entity,key:string) => {
    if (key[0] !== "#") return named[key.toLowerCase()] ?? entity;
    const n = key[1]?.toLowerCase() === "x" ? parseInt(key.slice(2),16) : Number(key.slice(1));
    return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : "�";
  });
}
export function parseSourceHtml(html:string): SourceElement {
  const root:SourceElement = {kind:"element",tag:"root",attrs:{},children:[],start:0,openEnd:0,end:html.length,closeStart:html.length};
  const stack = [root];
  const tokens = /<!--[\\s\\S]*?-->|<![^>]*>|<\\/?[a-z][a-z0-9:-]*(?:"[^"]*"|'[^']*'|[^'">])*?>|[^<]+|</gi;
  for (const m of html.matchAll(tokens)) {
    const token=m[0], index=m.index!;
    if(token.startsWith("<!"))continue;
    const closing=/^<\\/([\\w:-]+)/.exec(token);
    if(closing){
      const found=stack.map(n=>n.tag).lastIndexOf(closing[1].toLowerCase());
      if(found>0){for(let i=stack.length-1;i>=found;i--){stack[i].closeStart=index;stack[i].end=index+token.length;}stack.length=found;}continue;
    }
    const opening=/^<([\\w:-]+)/.exec(token);
    if(opening){
      const tag=opening[1].toLowerCase();
      if(tag==="p"){const p=stack.map(n=>n.tag).lastIndexOf("p");if(p>0){for(let i=p;i<stack.length;i++){stack[i].end=index;stack[i].closeStart=index;}stack.length=p;}}
      const attrs:Record<string,string>=Object.create(null);
      for(const a of token.slice(opening[0].length).matchAll(/([^\\s=/>]+)(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+)))?/g))attrs[a[1].toLowerCase()]=decodeSourceEntities(a[2]??a[3]??a[4]??"");
      const node:SourceElement={kind:"element",tag,attrs,children:[],start:index,openEnd:index+token.length,end:html.length,closeStart:html.length};
      stack.at(-1)!.children.push(node);
      if(VOID.has(tag)||/\\/\\s*>$/.test(token))node.end=node.closeStart=node.openEnd;
      else{if(stack.length>=128)throw new Error("Scripture markup is nested too deeply.");stack.push(node);}continue;
    }
    if(!UNSAFE.has(stack.at(-1)!.tag))stack.at(-1)!.children.push({kind:"text",value:decodeSourceEntities(token)});
  }
  return root;
}
export function sourceParagraphs(root:SourceElement):SourceElement[]{
  const result:SourceElement[]=[];
  const visit=(node:SourceElement)=>{if(UNSAFE.has(node.tag))return;if(node.tag==="p"||node.tag==="para"){result.push(node);return;}for(const child of node.children)if(child.kind==="element")visit(child);};visit(root);return result;
}
''')
put('src/lib/bible/sourceTextParts.ts', '''import type { VersePart } from "./api";
/** One whitespace stream for both text and styled parts. No word guessing. */
export function normalizeSourceParts(input:VersePart[]):VersePart[]{
  const output:VersePart[]=[];let text="";let pendingSpace:Extract<VersePart,{kind:"text"}>|undefined;
  const append=(part:Extract<VersePart,{kind:"text"}>,value:string)=>{if(!value)return;const last=output.at(-1);if(last?.kind==="text"&&last.style===part.style&&last.isJesus===part.isJesus)last.text+=value;else output.push({...part,text:value});text+=value;};
  for(const part of input){
    if(part.kind!=="text"){output.push({...part});continue;}
    if(part.style==="divine"&&/^Lord\\b/.test(part.text)&&/\\bthe$/.test(text)&&!pendingSpace)pendingSpace={...part,text:" "};
    const sourceText=part.text.replace(/#\\s*[—–−-]\\s*#/g,"—");
    for(const ch of sourceText){if(/\\s/u.test(ch)){if(text)pendingSpace=part;continue;}if(pendingSpace&&!/[,.;:!?“”’]/u.test(ch))append(pendingSpace," ");pendingSpace=undefined;append(part,ch);}
  }
  return output;
}
''')
