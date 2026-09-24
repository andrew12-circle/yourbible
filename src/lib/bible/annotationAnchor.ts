/** Account-scoped user-selected excerpts. Saved only after a successful mark write. */
export interface AnnotationAnchor { text:string; prefix:string; suffix:string; start:number; end:number }
const memory=new Map<string,AnnotationAnchor>();
const keyFor=(owner:string,id:string)=>`yb-annotation-v1:${encodeURIComponent(owner)}:${encodeURIComponent(id)}`;
export function createAnnotationAnchor(text:string,start:number,end:number):AnnotationAnchor|undefined{
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>text.length)return undefined;
  return{text:text.slice(start,end),prefix:text.slice(Math.max(0,start-24),start),suffix:text.slice(end,end+24),start,end};
}
export function saveAnnotationAnchor(owner:string,id:string,anchor:AnnotationAnchor):void{
  const key=keyFor(owner,id);memory.set(key,anchor);try{localStorage.setItem(key,JSON.stringify(anchor));}catch{/* Session copy survives blocked storage. */}
}
export function readAnnotationAnchor(owner:string,id:string):AnnotationAnchor|undefined{
  const key=keyFor(owner,id);
  try{const raw=localStorage.getItem(key);if(raw){const v=JSON.parse(raw);if(typeof v.text==='string'&&typeof v.prefix==='string'&&typeof v.suffix==='string'&&Number.isInteger(v.start)&&Number.isInteger(v.end)&&v.start>=0&&v.end>v.start&&v.text.length===v.end-v.start)return v;}}catch{/* Never trust corrupt anchors. */}
  return memory.get(key);
}
export function resolveAnnotationAnchor(current:string,anchor:AnnotationAnchor):number|undefined{
  if(!anchor.text)return undefined;const candidates:number[]=[];let at=current.indexOf(anchor.text);
  while(at>=0){candidates.push(at);at=current.indexOf(anchor.text,at+1);}
  const contextual=candidates.filter(i=>current.slice(Math.max(0,i-anchor.prefix.length),i)===anchor.prefix&&current.slice(i+anchor.text.length,i+anchor.text.length+anchor.suffix.length)===anchor.suffix);
  return candidates.length===1?candidates[0]:contextual.length===1?contextual[0]:undefined;
}
