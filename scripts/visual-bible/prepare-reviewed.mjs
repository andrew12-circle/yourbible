/** Assemble the already-reviewed source pins and explicit editorial labels.
 * This does not inspect or approve arbitrary future discoveries. */
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {REVIEWED_PINS} from './reviewed-pins.mjs';
import {OBJECT_REVIEW} from './object-review.mjs';
import {HERITAGE_REVIEW} from './heritage-review.mjs';
import {ATLAS_REVIEW} from './atlas-review.mjs';
import {artReview,placeReview} from './art-place-review.mjs';
const root=process.env.VISUAL_REVIEW_DIR||'visual-review';
const research=JSON.parse(await readFile(join(root,'review.json'),'utf8'));
const rows=new Map(research.results.map(row=>[row.target.id,row]));
const approvals=[];
for(const pin of REVIEWED_PINS){
 const row=rows.get(pin.target),candidate=row?.candidates.find(c=>c.pageId===pin.pageId);
 if(!candidate||candidate.rejects.length||!candidate.previewFile||!candidate.previewSha256)throw new Error('Missing eligible reviewed source: '+pin.target);
 const pack=row.target.pack,id=pin.id||pin.target;
 let label;
 if(pack==='masterworks')label=artReview(row.target,candidate);
 else if(pack==='places')label=placeReview(row.target,candidate);
 else label=OBJECT_REVIEW[id]||HERITAGE_REVIEW[id]||ATLAS_REVIEW[id];
 if(!label?.description||!label?.caution||!label?.passageNote)throw new Error('Missing editorial review: '+id);
 const photographer=label.photographer||(pack==='artifacts'?candidate.creator:undefined);
 approvals.push({...pin,decision:'approve',visualReviewed:true,rightsReviewed:true,passageReviewed:true,...label,...(photographer?{photographer}:{}),
   reviewEvidence:{pageId:pin.pageId,previewSha256:candidate.previewSha256,sourceSha1:candidate.sourceSha1,sourceRecordRevision:candidate.pageRevision}});
}
if(approvals.length!==323)throw new Error('Incomplete reviewed selection');
await writeFile('scripts/visual-bible/approved-selections.json',JSON.stringify(approvals,null,2)+'\n');
console.log(`${approvals.length} explicit reviewed decisions assembled; source identity is rechecked by the importer.`);
