/** Publish only explicit reviewed selections. Discovery results alone cannot enter the app. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { TARGETS, COLLECTION_GOALS, ICONIC_TARGETS } from './targets.mjs';
import { validateSeed } from '../acquire-visual-bible.mjs';
import { CANON_CHAPTERS } from '../lib/visual-bible-catalog.mjs';

const root = process.cwd();
const reviewRoot = resolve(process.env.VISUAL_REVIEW_DIR || 'visual-review');
const approvals = JSON.parse(await readFile(join(root, 'scripts/visual-bible/approved-selections.json'), 'utf8'));
const research = JSON.parse(await readFile(join(reviewRoot, 'review.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const text = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const approved = [], evidence = [], usedPages = new Set();
const checkedOn = new Date().toISOString().slice(0,10);
async function currentInfo(file) {
  const params = new URLSearchParams({action:'query',format:'json',formatversion:'2',maxlag:'5',titles:file,prop:'imageinfo|revisions',iiprop:'url|size|mime|extmetadata|sha1',iiurlwidth:'3200',iiurlheight:'3200',iiextmetadatalanguage:'en',rvprop:'ids'});
  for(let attempt=0;attempt<4;attempt++) {
    const response = await fetch('https://commons.wikimedia.org/w/api.php?'+params,{redirect:'error',headers:{'User-Agent':'YourBibleVisualResearch/2.0 (https://github.com/andrew12-circle/yourbible; reviewed acquisition)'},signal:AbortSignal.timeout(35000)});
    if(response.status===429||response.status===503){await response.body?.cancel();await delay(4000*(attempt+1));continue;}
    if(!response.ok)throw new Error('Metadata HTTP '+response.status);
    const data=await response.json();
    if(data.error){if(data.error.code==='maxlag'){await delay(5000);continue;}throw new Error(data.error.info);}
    return data.query?.pages?.[0];
  }
  throw new Error('Metadata retries exhausted');
}
function passage(reference, relationship, note, inline=true) {
  const match=/^(\d?[A-Za-z]{2,3}) (\d+)(?::(\d+)(?:-(\d+))?)?$/.exec(reference);
  if(!match || !CANON_CHAPTERS[match[1]])throw new Error('Unrecognized reviewed reference: '+reference);
  return {book:match[1],chapter:Number(match[2]),...(match[3]?{verse:Number(match[3])}:{}),...(match[4]?{endVerse:Number(match[4])}:{}),relationship,note,inline};
}
for(const decision of approvals) {
  if(decision.decision!=='approve')continue;
  if(decision.visualReviewed!==true||decision.rightsReviewed!==true||decision.passageReviewed!==true||!decision.description||!decision.caution||!decision.passageNote)throw new Error('Incomplete editorial decision: '+decision.target);
  const row=research.results.find(row=>row.target.id===decision.target);
  const candidate=row?.candidates.find(item=>item.pageId===decision.pageId);
  if(!candidate||candidate.rejects.length||!candidate.previewFile||!candidate.previewSha256)throw new Error('No eligible, inspected candidate: '+decision.target);
  const preview=await readFile(join(reviewRoot,candidate.previewFile));
  if(sha(preview)!==candidate.previewSha256)throw new Error('Changed review preview: '+decision.target);
  if(usedPages.has(candidate.pageId))throw new Error('Same source image selected twice: '+candidate.file);
  usedPages.add(candidate.pageId);
  const page=await currentInfo(candidate.file),info=page?.imageinfo?.[0];
  if(!info||page.pageid!==candidate.pageId||info.sha1!==candidate.sourceSha1)throw new Error('Source image changed after review: '+candidate.file);
  const currentLicense=text(info.extmetadata?.LicenseShortName?.value);
  const oldLicense=text(candidate.meta?.LicenseShortName?.value);
  if(currentLicense!==oldLicense)throw new Error('Image rights designation changed: '+candidate.file);
  const vector=info.mime==='image/svg+xml';
  const oversized=info.size>28_000_000||info.width*info.height>90_000_000;
  const imageUrl=vector||oversized?info.thumburl:info.url;
  const dims=vector||oversized?{width:info.thumbwidth,height:info.thumbheight}:{width:info.width,height:info.height};
  if(!imageUrl||!dims.width||!dims.height||Math.max(dims.width,dims.height)<1200)throw new Error('No adequate raster source: '+candidate.file);
  if(vector&&!/\.png(?:\?|$)/i.test(imageUrl))throw new Error('Vector map has no safe provider PNG rendition: '+candidate.file);
  const target=row.target,pack=target.pack;
  const kind=decision.kind || ({masterworks:'artwork',maps:'map',artifacts:'artifact',heritage:'manuscript',places:'place-photo'}[pack]);
  const creator=decision.creator || target.creator || candidate.creator || 'Maker not identified in the source record';
  const credit=decision.credit || [candidate.creator,candidate.credit,candidate.attribution].filter(Boolean).join(' · ') || creator;
  const license=candidate.license;
  const record={
    id:decision.id||target.id,revision:1,kind,title:decision.title||target.title,creator,
    date:decision.date||'Date not specified in source metadata',culture:decision.culture||'See the source record',
    medium:decision.medium||({artwork:'Reproduction of historical sacred art',artifact:'Photograph of a historical object',map:'Cartographic reference',manuscript:'Manuscript image','place-photo':'Modern site photograph',architecture:'Architectural reference'}[kind]||'Historical visual reference'),
    description:decision.description,caution:decision.caution,tags:[target.title,target.query,...(decision.tags||[])],
    passages:decision.passages||[passage(decision.reference||target.reference,decision.relationship||({masterworks:'depiction',maps:'geography',artifacts:'cultural-context',heritage:'textual-history',places:'geography'}[pack]),decision.passageNote,decision.inline!==false)],
    source:{name:decision.sourceName||'Wikimedia Commons',objectId:String(page.pageid),url:info.descriptionurl,license:license.label,licenseUrl:license.url,credit,checkedOn,
      ...(decision.photographer?{photographer:decision.photographer}:{}),
      recordRevision:page.revisions?.[0]?.revid,imageSha1:info.sha1,originalImageUrl:info.url,
      rightsNote:decision.rightsNote||(license.label==='Public domain'?'The selected source record identifies this reproduction as public domain. Territorial rights and institution-specific restrictions may differ.':'The photographer’s image license is distinct from the age or copyright status of the object. Attribution and applicable share-alike conditions remain attached to these resized derivatives.'),
      ...(decision.objectUrl?{objectUrl:decision.objectUrl}:{}),
    },
    review:'source-checked',imageUrl,alt:decision.alt||decision.title||target.title,
    collections:decision.collections||[pack],technique:decision.technique||({masterworks:'painting',maps:'map',artifacts:'photograph',heritage:'manuscript',places:'photograph'}[pack]),
    ...(decision.period?{period:decision.period}:{}),...(decision.holdingCollection?{holdingCollection:decision.holdingCollection}:{}),
    workGroup:decision.workGroup||decision.id||target.id,iconic:ICONIC_TARGETS.includes(target.id),readerRank:decision.readerRank??(ICONIC_TARGETS.includes(target.id)?0:20),sourceDimensions:dims,readerDerivative:true,
  };
  validateSeed([record]);approved.push(record);
  evidence.push({id:decision.id||target.id,file:candidate.file,pageId:page.pageid,sourceRevision:page.revisions?.[0]?.revid,sourceSha1:info.sha1,previewSha256:candidate.previewSha256,reviewedOn:checkedOn,reviewMethod:'Explicit visual, source-rights and passage review; not automatic search publication',decision});
  console.log('Prepared reviewed image: '+target.id);await delay(250);
}
if(!approved.length)throw new Error('No approved images');
for(const id of ICONIC_TARGETS)if(!approved.some(record=>record.id===id))throw new Error('Required iconic work is not approved: '+id);
validateSeed(approved);
await writeFile(join(root,'src/data/visualBible/collectionExpansion.json'),JSON.stringify(approved,null,2)+'\n');
await mkdir(join(root,'docs/visual-bible'),{recursive:true});
const pending=TARGETS.filter(target=>!approved.some(asset=>asset.id===target.id)).map(target=>({id:target.id,title:target.title,pack:target.pack,reason:approvals.find(a=>a.target===target.id)?.reason||'Not yet selected after source/quality review'}));
await writeFile(join(root,'docs/visual-bible/acquisition-review.json'),JSON.stringify({reviewedOn:checkedOn,researchGeneratedAt:research.generatedAt,goals:COLLECTION_GOALS,imported:approved.length,byCollection:Object.fromEntries(Object.keys(COLLECTION_GOALS).map(pack=>[pack,approved.filter(a=>a.collections.includes(pack)).length])),evidence,pending},null,2)+'\n');
console.log(`${approved.length} explicit selections ready for image acquisition; ${pending.length} targets not published.`);
