/** One-time integration patch; removed after the reviewed bundle is committed. */
import {readFile,writeFile} from 'node:fs/promises';
async function edit(path,fn){const before=await readFile(path,'utf8');const after=fn(before);if(after===before)throw new Error('Expected integration change missing: '+path);await writeFile(path,after);}
function replace(code,old,next){if(!code.includes(old))throw new Error('Expected source fragment missing: '+old.slice(0,100));return code.replace(old,next);}
await edit('scripts/visual-bible/import-reviewed.mjs',code=>{
 code=replace(code,'id:target.id,revision:1','id:decision.id||target.id,revision:1');
 code=replace(code,"source:{name:'Wikimedia Commons'","source:{name:decision.sourceName||'Wikimedia Commons'");
 code=replace(code,"...(decision.photographer?{photographer:decision.photographer}:license.label!=='Public domain'&&pack!=='masterworks'?{photographer:candidate.creator||credit}:{}),","...(decision.photographer?{photographer:decision.photographer}:{}),");
 code=replace(code,'workGroup:decision.workGroup||target.id','workGroup:decision.workGroup||decision.id||target.id');
 code=replace(code,'evidence.push({id:target.id','evidence.push({id:decision.id||target.id');
 return code;
});
await edit('scripts/acquire-visual-bible.mjs',code=>{
 code=replace(code,'import sharp from "sharp";', 'import sharp from "sharp";\nimport { imageResponseError, imageRetryDelay } from "./lib/image-download-backoff.mjs";');
 code=replace(code,'"art.thewalters.org", "upload.wikimedia.org"','"art.thewalters.org", "upload.wikimedia.org", "thumb.wikimedia.org"');
 code=replace(code,'throw new Error(`Image request failed (${response.status}): ${url}`);','throw imageResponseError(response, url);');
 code=replace(code,'attempt < 3','attempt < 5');
 code=replace(code,'if (attempt === 2) throw error; await new Promise(done => setTimeout(done, 2_000 * (attempt + 1)));','if (attempt === 4) throw error; const pause = imageRetryDelay(error, attempt); console.warn(`Source paused; waiting ${pause}ms before retrying ${asset.id}`); await new Promise(done => setTimeout(done, pause));');
 code=replace(code,'    entries.push(record);\n    console.log', '    entries.push(record);\n    // Save a resumable acquisition checkpoint; verification still requires the full catalog.\n    await writeAtomic(manifestPath, `${JSON.stringify({ schemaVersion: 1, entries }, null, 2)}\\n`);\n    if (asset.imageUrl.includes("wikimedia.org")) await new Promise(done => setTimeout(done, 1000));\n    console.log');
 return code;
});
await edit('scripts/visual-bible/discover.mjs',code=>replace(code,"['commons.wikimedia.org', 'upload.wikimedia.org']","['commons.wikimedia.org', 'upload.wikimedia.org', 'thumb.wikimedia.org']"));
await edit('scripts/visual-bible/art-place-review.mjs',code=>replace(code,' data.passageNote=data.relationship',` if(['leonardo-rocks','raphael-sistine-madonna','raphael-meadow','rembrandt-family','latour-magdalene','latour-joseph','millais-parents'].includes(key))data.inline=false;
 if(key==='raphael-fishing')data.reference='Luk 5:6';
 data.passageNote=data.relationship`));
console.log('Import compatibility changes applied without changing Scripture or account data.');
