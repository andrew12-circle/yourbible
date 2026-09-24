from pathlib import Path
p=Path('scripts/test-bible-chapter-continuation.mjs');s=p.read_text()
s=s.replace('mkdirSync, readFileSync }','mkdirSync, readFileSync, existsSync }')
anchor='function syntheticPassage(book, chapter) {'
assert s.count(anchor)==1
s=s.replace(anchor,'''const sourceParser = process.env.READER_SOURCE_FIXTURES === '1'
  ? (await server.ssrLoadModule('/src/lib/bible/parsePassageHtml.ts')).parsePassageHtml : null;
const sourceFixtureCache = new Map();
function syntheticPassage(book, chapter) {
  if (sourceParser) {
    const key=book+':'+chapter, path=join(root,'src/lib/bible/fixtures/golden/csb-'+book.toLowerCase()+'-'+chapter+'.html');
    if(sourceFixtureCache.has(key))return sourceFixtureCache.get(key);
    if(existsSync(path)){
      const rawContent=readFileSync(path,'utf8');
      const result={...sourceParser(rawContent,book+' '+chapter),rawContent};
      sourceFixtureCache.set(key,result);return result;
    }
  }''',1)
anchor='async function settled() {'
assert s.count(anchor)==1
s=s.replace(anchor,r'''async function verifyPublishedSpeech(words) {
  const rows=await page.evaluate(()=>[...document.querySelectorAll('[data-reader-page-side] [data-verse-id]')].map(node=>{
    const body=node.querySelector('[data-verse-body]');const flags=[];
    if(!body)return{flags};
    const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);
    for(let n=walker.nextNode();n;n=walker.nextNode()){
      if(n.parentElement.closest('sup,figure'))continue;
      for(const ch of n.textContent)if(/[\p{L}\p{N}]/u.test(ch))flags.push(!!n.parentElement.closest('.red-letter'));
    }
    return{flags};
  }));
  for(let i=0;i<words.length;i++){
    const row=words[i],[,b,c,v]=row.id.split(':');const source=lookupVerse(b,Number(c),Number(v));
    if(!source.sourceBlocks)continue;
    const expected=[];let offset=0;
    for(const part of source.parts||[])if(part.kind==='text'){
      for(const ch of part.text){if(offset>=row.start&&offset<row.end&&/[\p{L}\p{N}]/u.test(ch))expected.push(part.isJesus===true);offset+=ch.length;}
    }
    assert.deepEqual(rows[i].flags,expected,'Publisher speech coloring changed on '+row.id+'@'+row.start);
  }
}
async function settled() {''',1)
s=s.replace('      verifyWords(words);','      verifyWords(words);\n      if(sourceParser)await verifyPublishedSpeech(words);');p.write_text(s)
# Correct the old unsupported provenance claim; retain the legacy fallback explicitly.
p=Path('src/lib/bible/redLetter.ts');s=p.read_text();a=s.index('/**');b=s.index('export type Segment',a)
s=s[:a]+'''/** Publisher speech attributes are authoritative when available.
 * Legacy unmarked data retains the existing best-effort quotation fallback.
 * The fallback is not certified as identical to a publisher red-letter edition.
 */

'''+s[b:]
a=s.index('/**\n * Verses where the entire verse');b=s.index('const RED_WHOLE',a)
s=s[:a]+'''/** Legacy candidate list only. Explicit source attributes bypass this heuristic. */
'''+s[b:];p.write_text(s)
