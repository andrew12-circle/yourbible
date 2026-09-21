import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
let code = readFileSync('scripts/test-bible-book-flow.mjs', 'utf8')
  .replace('{ mkdtempSync, writeFileSync, rmSync, mkdirSync }', '{ mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync }')
  .replace("||'/read/Jhn/3'", "||'/read/Act/6'")
  .replace("profile:{font_choice:'serif'", "profile:{font_choice:localStorage.getItem('yb.fontChoice')||'serif'")
  .replace("localStorage.setItem('yb.fontScale',String(s.scale));", "localStorage.setItem('yb.fontScale',String(s.scale));localStorage.setItem('yb.fontChoice',s.font);");
const replaceSection = (start, end, replacement) => {
  const a=code.indexOf(start), b=code.indexOf(end,a);
  if(a<0||b<0) throw new Error('Reader test harness changed: '+start);
  code=code.slice(0,a)+replacement+code.slice(b);
};
// Diagnostic instrumentation is isolated to the fixture alias, never the app.
const target=resolve('src/components/bible/BookPaginator.tsx');
const instrumented=readFileSync(target,'utf8').replace('return scriptureContentFitsPage(node, limit, columnsClassName);', `const fits = scriptureContentFitsPage(node, limit, columnsClassName);
      if (!fits && end-start<6) {
        const rect = node.getBoundingClientRect();
        const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT), range=document.createRange(), bad=[];
        for(let t=walker.nextNode();t;t=walker.nextNode()) {
          if(!t.textContent?.trim())continue;
          range.selectNodeContents(t);
          for(const r of range.getClientRects()) {
            if(r.top<rect.top-1||r.bottom>Math.min(rect.bottom,rect.top+limit)+1||r.left<rect.left-1||r.right>rect.right+1)
              bad.push({text:t.textContent,rect:r.toJSON(),bounds:rect.toJSON()});
          }
        }
        const trace = window.__readerFitTrace??=[];
        trace.push({start,end,limit,scrollHeight:node.scrollHeight,first:stream[start],bad});
        if(trace.length>200)trace.shift();window.__readerFitTrace=trace;
      }
      return fits;`);
const alias=resolve('scripts/.BookPaginator-trace.tsx');
writeFileSync(alias,instrumented);
code=code.replace("resolve:{alias:[", "resolve:{alias:[{find:'@/components/bible/BookPaginator',replacement:"+JSON.stringify(alias)+"},");
replaceSection('function syntheticPassage(', 'async function settled()', `function syntheticPassage(book, chapter) {
  const d=JSON.parse(readFileSync(join(root,'public/bibles/csb/chapters/'+book+'/'+chapter+'.json'),'utf8'));
  const study=new Map((d.layout.studyByVerse||[]).map(v=>[v.verseId,v]));
  return {reference:book+' '+chapter, ...d.layout,
    verses:d.verses.map(v=>({number:v.verse,text:v.text,...study.get(v.verseId)}))};
}
`);
replaceSection('  const scenarios = [', '  for (scenario of scenarios)', `  const scenarios=[
    {name:'acts-sans',font:'sans',columns:'single',study:'inline',scale:1,width:1491,height:936},
    {name:'acts-sf',font:'sf',columns:'single',study:'inline',scale:1,width:1491,height:936},
    {name:'acts-sans-double',font:'sans',columns:'double',study:'inline',scale:1,width:1491,height:936}
  ];
`);
replaceSection('    if (scenario.oversized)', '  assert.deepEqual(browserErrors,[]);', `    for(let step=0;step<7;step++) {
      const current=await inspect();
      const extra=await page.evaluate(()=>({history:window.__readerPositionHistory,fitTrace:window.__readerFitTrace,
        html:[...document.querySelectorAll('[data-reader-page-side] article')].map(n=>n.outerHTML)}));
      steps.push({scenario:scenario.name,step,...current,position:extra.history.at(-1)});
      if(step<4) await page.screenshot({path:join(output,scenario.name+'-'+step+'.png')});
      writeFileSync(join(output,scenario.name+'-'+step+'.json'),JSON.stringify({...current,...extra},null,2));
      await turn(1);
    }
    await page.close();page=null;
  }
  writeFileSync(join(output,'chapter-flow-summary.json'),JSON.stringify({steps,requests},null,2));
`);
const file=resolve('scripts/.chapter-continuation-run.mjs');
writeFileSync(file,code);
try { await import(pathToFileURL(file).href); } finally { rmSync(file,{force:true});rmSync(alias,{force:true}); }
