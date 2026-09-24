import { parseSourceHtml, sourceClasses, sourceParagraphs, type SourceNode } from "./sourceHtml";
/** Independently visit all body paragraphs; never reuse the parser allowlist. */
export function sourceScriptureText(html:string):string{
  const root=parseSourceHtml(html),chunks:string[]=[];
  const ignored=new Set(["v","f","fe","x","xt","xo","fr","ft","fq","fqa","fk","sup","va","vp"]);
  const walk=(node:SourceNode)=>{if(node.kind==="text"){chunks.push(node.value);return;}if(["script","style","note","figure","template","iframe","object"].includes(node.tag))return;if([...sourceClasses(node)].some(c=>ignored.has(c)))return;if(node.tag==="br"){chunks.push(" ");return;}node.children.forEach(walk);};
  for(const block of sourceParagraphs(root)){if([...sourceClasses(block)].some(c=>/^(s\d*|ms\d*|d|qa|r|mr|sr|mt\d*|c|cp|cl|ca|b)$/.test(c)))continue;walk(block);chunks.push(" ");}
  return chunks.join("").replace(/\s+/g," ").trim();
}
export function sourceComparableText(text:string):string{return text.replace(/#\s*[—–−-]\s*#/g,"—").toLowerCase().replace(/\s+/g,"");}
