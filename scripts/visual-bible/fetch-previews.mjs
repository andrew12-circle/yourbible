/** The Foundation moved thumbnail delivery to thumb.wikimedia.org in September 2026.
 * https://diff.wikimedia.org/2026/09/16/wikimedia-foundation-bulletin-2026-issue-17/
 * Retrieve only image previews from an existing research queue; never publish it. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.env.VISUAL_REVIEW_DIR||'visual-review';
const queue=JSON.parse(await readFile(join(root,'review.json'),'utf8'));
const hosts=new Set(['thumb.wikimedia.org','upload.wikimedia.org']);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function checked(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!hosts.has(u.hostname))throw new Error('Unexpected preview host');return u.href;}
async function download(input){
 for(let attempt=0;attempt<3;attempt++){
  let url=checked(input);
  for(let redirect=0;redirect<4;redirect++){
   const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(35000),headers:{'User-Agent':'YourBibleVisualResearch/2.0 (https://github.com/andrew12-circle/yourbible; image review)',Accept:'image/*'}});
   if(response.status===429||response.status===503){await response.body?.cancel();await wait(4000*(attempt+1));break;}
   if(response.status>=300&&response.status<400){await response.body?.cancel();url=checked(new URL(response.headers.get('location'),url).href);continue;}
   if(!response.ok||!/^image\/(jpeg|png|webp|tiff)(;|$)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw new Error('Invalid image response '+response.status);}
   const parts=[];let size=0;const reader=response.body.getReader();
   try{while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>6000000)throw new Error('Preview too large');parts.push(value);}}catch(error){await reader.cancel();throw error;}
   if(!size)throw new Error('Empty preview');return Buffer.concat(parts);
  }
 }
 throw new Error('Preview request budget exhausted');
}
await mkdir(join(root,'thumbnails'),{recursive:true});
const candidates=queue.results.flatMap(row=>row.candidates).filter(c=>!c.rejects.length&&c.thumbnailUrl);
let next=0,success=0;
async function worker(){
 while(next<candidates.length){const c=candidates[next++];
  try{const bytes=await download(c.thumbnailUrl);c.previewFile='thumbnails/'+c.key+'.jpg';c.previewSha256=sha(bytes);delete c.previewError;await writeFile(join(root,c.previewFile),bytes);success++;}
  catch(error){c.previewError=String(error);delete c.previewFile;delete c.previewSha256;}
  await wait(250);
 }
}
await Promise.all([worker(),worker(),worker()]);
await writeFile(join(root,'review.json'),JSON.stringify(queue,null,2));
console.log(`${success}/${candidates.length} review previews retrieved. No reader records were published.`);
if(!success)throw new Error('No inspectable previews');
