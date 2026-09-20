import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const source = readFileSync('scripts/test-bible-book-flow.mjs', 'utf8');
const trace = `
writeFileSync(join(scratch,'fit-trace.ts'), \`
import { readerVisibleFit as original } from \${JSON.stringify(join(root,'src/lib/bible/readerVisibleFit.ts'))};
export function readerVisibleFit(root, height) {
  const result = original(root, height);
  if (!result.fits && root.closest('[data-reader-page-side]')) {
    const a=root.getBoundingClientRect(), failures=[];
    const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), range=document.createRange();
    for(let node=walk.nextNode();node;node=walk.nextNode()) {
      if(!node.textContent.trim()||!node.parentElement)continue;
      let top=a.top,bottom=a.bottom,left=a.left,right=a.right;
      const ancestors=[];
      for(let e=node.parentElement;e&&e!==root;e=e.parentElement) {
        const css=getComputedStyle(e),b=e.getBoundingClientRect();
        if(/^(hidden|clip|auto|scroll)$/.test(css.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);ancestors.push({tag:e.tagName,cls:e.className,top:b.top,bottom:b.bottom})}
        if(/^(hidden|clip|auto|scroll)$/.test(css.overflowX)){left=Math.max(left,b.left);right=Math.min(right,b.right)}
      }
      range.selectNodeContents(node);
      for(const r of range.getClientRects())if(r.width&&r.height&&(r.top<top-1||r.bottom>bottom+1||r.left<left-1||r.right>right+1))failures.push({text:node.textContent.slice(0,90),rect:{top:r.top,bottom:r.bottom,left:r.left,right:r.right},bounds:{top,bottom,left,right},ancestors});
    }
    const history=window.__readerFitFailures??=[];
    if(history.length<10)history.push({result,side:root.closest('[data-reader-page-side]').dataset.readerPageSide,failures,html:root.outerHTML});
    window.__readerFitFailures=history;
  }
  return result;
}
\`);
`;
const code=source.replace("writeFileSync(join(scratch,'fixture.tsx'),",trace+"writeFileSync(join(scratch,'fixture.tsx'),")
  .replace("alias:[", "alias:[{find:'@/lib/bible/readerVisibleFit',replacement:join(scratch,'fit-trace.ts')},")
  .replace("{scenario,diagnostic,steps,history:","{scenario,diagnostic,steps,fitFailures:await page.evaluate(()=>window.__readerFitFailures),history:");
const file=resolve('scripts/.book-flow-diagnostic.mjs');
writeFileSync(file,code);
try {await import(pathToFileURL(file).href)} finally {rmSync(file,{force:true})}
