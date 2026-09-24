/** Add exact open-atlas files and targeted research gaps to the review queue only. */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.env.VISUAL_REVIEW_DIR||'visual-review';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(params){
 for(let attempt=0;attempt<4;attempt++){
  const response=await fetch('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',maxlag:'5',...params}),{redirect:'error',headers:{'User-Agent':'YourBibleVisualResearch/2.0 (https://github.com/andrew12-circle/yourbible; atlas review)'},signal:AbortSignal.timeout(35000)});
  if(response.status===429||response.status===503){await response.body?.cancel();await wait(4000*(attempt+1));continue;}
  if(!response.ok)throw new Error('Atlas metadata HTTP '+response.status);
  const data=await response.json();if(data.error)throw new Error(data.error.info);return data;
 }
 throw new Error('Atlas request budget exhausted');
}
let continuation={};const atlas=[];
for(let page=0;page<5;page++){
 const data=await api({list:'allpages',apnamespace:'6',apprefix:'Biblica Open Bible Map',aplimit:'100',...continuation});
 for(const item of data.query.allpages){
  // Color and classic series only; black-and-white variants are not counted twice.
  if(!/\.(png|jpg|jpeg)$/i.test(item.title)||/\b(BW|B&W|black.and.white)\b/i.test(item.title))continue;
  atlas.push({id:'maps-biblica-'+item.pageid,pack:'maps',title:item.title.replace(/^File:Biblica Open Bible Map\s*/,'').replace(/\.(png|jpe?g)$/i,''),reference:'Act 1',query:item.title,file:item.title.slice(5)});
 }
 if(!data.continue)break;continuation=data.continue;await wait(300);
}
const extra=`
artifacts-pilate-original|artifacts|Pilate inscription in Israel Museum|Mat 27|"Pilate inscription" "Israel Museum" -replica
artifacts-gallio-delphi|artifacts|Gallio inscription at Delphi|Act 18:12|"Gallio inscription" Delphi museum
artifacts-lachish-ostraca|artifacts|Lachish ostraca|Jer 34|"Lachish letters" "British Museum"
artifacts-beersheba-horned|artifacts|Beersheba horned altar|Amo 3:14|"Beersheba" "altar" "Israel Museum"
artifacts-arad-incense|artifacts|Arad incense altar|2Ki 23|"Arad" "altar" "Israel Museum"
artifacts-jehoiachin|artifacts|Babylonian ration tablet mentioning Jehoiachin|2Ki 25:27|"Jehoiachin" tablet
artifacts-nebuchadnezzar-brick|artifacts|Inscribed brick of Nebuchadnezzar II|Dan 4|"Nebuchadnezzar" "brick" museum
artifacts-nabonidus|artifacts|Cylinder of Nabonidus|Dan 5|"Nabonidus" "cylinder" museum
artifacts-esarhaddon|artifacts|Victory stele of Esarhaddon|Isa 37:38|"Esarhaddon" "stele" Berlin
artifacts-shoshenq|artifacts|Karnak relief of Shoshenq I|2Ch 12|"Shoshenq" "Karnak" relief
artifacts-cyrus-brick|artifacts|Brick stamped with the name of Cyrus|Ezr 1|"Cyrus" "brick" museum
artifacts-darius-inscription|artifacts|Inscription of Darius from Susa|Ezr 6|"Darius" "inscription" "Louvre"
artifacts-artaxerxes|artifacts|Achaemenid inscription naming Artaxerxes|Neh 2|"Artaxerxes" inscription museum
artifacts-pomegranate|artifacts|Ancient ivory pomegranate|1Ki 7:18|"ivory pomegranate" museum
artifacts-lyre|artifacts|Ancient Mesopotamian lyre|Psa 33:2|"lyre" "Ur" "British Museum"
artifacts-sistrum|artifacts|Ancient Egyptian sistrum|Exo 15:20|"sistrum" "Metropolitan Museum"
artifacts-roman-inkwell|artifacts|Roman inkwell|2Jn 1:12|"Roman" "inkwell" museum
artifacts-roman-key|artifacts|Roman key|Rev 3:7|"Roman" "key" "Metropolitan Museum"
artifacts-roman-scale|artifacts|Roman weighing balance|Pro 11:1|"Roman" "balance" "British Museum"
artifacts-stone-vessel|artifacts|Herodian stone vessel|Jhn 2:6|"stone vessels" "Herodian" museum
artifacts-stone-measure|artifacts|Jerusalem stone measuring vessel|Jhn 2:6|"stone measuring" "Jerusalem"
artifacts-egypt-basket|artifacts|Ancient Egyptian basket|Exo 2:3|"basket" "Egypt" "Metropolitan Museum"
artifacts-roman-bread|artifacts|Preserved bread from Pompeii|Mat 6:11|"bread" "Pompeii" museum
artifacts-roman-strigil|artifacts|Roman bronze strigil|1Co 9:24|"strigil" "Metropolitan Museum"
artifacts-roman-fibula|artifacts|Roman garment brooch|Mat 9:20|"fibula" "Roman" "Metropolitan Museum"
artifacts-greek-olpe|artifacts|Ancient ceramic jug|2Co 4:7|"terracotta" "olpe" "Metropolitan Museum"
artifacts-mesopotamian-weight|artifacts|Mesopotamian duck weight|Deu 25:13|"duck weight" museum
artifacts-lydian-coin|artifacts|Ancient Lydian electrum coin|Mat 22:19|"Lydian" "coin" "British Museum"
artifacts-darius-seal|artifacts|Cylinder seal of Darius|Dan 6:17|"Darius" "seal" "British Museum"
artifacts-silver-scrolls|artifacts|Silver amulets from Ketef Hinnom|Num 6:24|"Ketef Hinnom" "Israel Museum" -svg
heritage-garima-detail|heritage|Garima Gospel illustration|Jhn 1|"Garima" "Gospels" -church -exterior
heritage-morgan-leaf|heritage|Morgan Crusader Bible scene|1Sa 17|"Morgan Bible" "David" -book
heritage-sinaiticus-leaf|heritage|Codex Sinaiticus leaf|Jhn 1|"Codex Sinaiticus" "folio" -book -cover
heritage-vaticanus-leaf|heritage|Codex Vaticanus leaf|Jhn 1|"Codex Vaticanus" "page" -book
heritage-dura-moses|heritage|Dura-Europos synagogue: Moses and the Exodus|Exo 14|"Dura Europos" "Moses" painting
heritage-dura-isaac|heritage|Dura-Europos synagogue: Isaac scene|Gen 22|"Dura Europos" "Isaac" painting
heritage-beth-alpha|heritage|Beth Alpha synagogue: binding of Isaac mosaic|Gen 22|"Beth Alpha" "Isaac" mosaic
heritage-madaba|heritage|Madaba mosaic map|Luk 19|"Madaba" "map" mosaic
heritage-rossano-last-supper|heritage|Rossano Gospels: Last Supper|Jhn 13|"Rossano" "Last Supper"
heritage-sinai-transfiguration|heritage|Sinai monastery Transfiguration mosaic|Mat 17|"Sinai" "Transfiguration" mosaic
heritage-toros-baptism|heritage|Armenian Gospel: baptism of Christ|Mat 3:13|"Toros Roslin" "Baptism"
heritage-bamburgh|heritage|Bamburgh Gospel illumination|Luk 1|"Bamburgh" "gospels"
heritage-ethiopian-crucifixion|heritage|Ethiopian crucifixion icon|Jhn 19|"Ethiopian" "Crucifixion" "Walters"
heritage-ethiopian-diptych|heritage|Ethiopian sacred diptych|Luk 2|"Ethiopian" "diptych" "Walters"
heritage-georgian-gospels|heritage|Georgian Gospel illumination|Jhn 1|"Georgian" "Gospels" miniature
places-lachish-israel|places|Tel Lachish archaeological site|2Ki 18|"Tel Lachish" Israel aerial
places-beersheba-israel|places|Tel Beersheba archaeological site|Gen 21|"Tel Beersheba" Israel ruins
places-hazor-israel|places|Tel Hazor archaeological site|Jos 11|"Tel Hazor" Israel ruins
places-sinai-egypt|places|Jebel Musa, traditional Sinai|Exo 19|"Mount Sinai" "Egypt" landscape
places-pisidia-turkey|places|Pisidian Antioch archaeological site|Act 13|"Antioch of Pisidia" ruins
places-gerizim-nablus|places|Mount Gerizim above Nablus|Jhn 4:20|"Mount Gerizim" Nablus
places-laodicea|places|Laodicea archaeological site|Rev 3:14|"Laodicea" "Lycus" ruins
places-sardis|places|Sardis archaeological site|Rev 3:1|"Sardis" "Temple" ruins
places-smyrna|places|Ancient Smyrna agora|Rev 2:8|"Smyrna" "agora" ruins
places-miletus|places|Miletus archaeological site|Act 20:17|"Miletus" "theatre" ruins
places-paphos|places|Paphos archaeological site|Act 13:6|"Paphos" archaeological park
places-caesarea-philippi|places|Banias, ancient Caesarea Philippi|Mat 16:13|"Banias" archaeological
places-joppa|places|Jaffa, ancient Joppa|Act 9:36|"Jaffa" "port" panorama
places-cyrene|places|Cyrene archaeological site|Act 11:20|"Cyrene" Libya ruins
places-pompeii|places|Pompeii Roman streets|Act 28|"Pompeii" "street" ruins
`.trim().split('\n').map(line=>{const[id,pack,title,reference,query]=line.split('|');return{id,pack,title,reference,query}});
const scratch=resolve('.visual-research-supplement');await mkdir(scratch,{recursive:true});
let code=await readFile('scripts/visual-bible/discover.mjs','utf8');
code=code.replace('["commons.wikimedia.org", "upload.wikimedia.org"]','["commons.wikimedia.org", "upload.wikimedia.org", "thumb.wikimedia.org"]');
code=code.replace('Math.max(info.width || 0, info.height || 0) < 1200','info.mime !== "image/svg+xml" && Math.max(info.width || 0, info.height || 0) < 1200');
code=code.replace('jpeg|png|tiff|webp','jpeg|png|tiff|webp|svg\\+xml');
const targets=[...atlas,...extra];
await writeFile(join(scratch,'targets.mjs'),'export const TARGETS='+JSON.stringify(targets)+'; export const COLLECTION_GOALS={masterworks:100,maps:50,artifacts:75,heritage:40,places:50}; export const ICONIC_TARGETS=[];');
await writeFile(join(scratch,'discover.mjs'),code);
const output=join(scratch,'output');
const child=spawnSync(process.execPath,[join(scratch,'discover.mjs')],{stdio:'inherit',env:{...process.env,VISUAL_REVIEW_DIR:output},timeout:1200000});
if(child.status!==0)throw new Error('Supplement discovery did not complete');
const base=JSON.parse(await readFile(join(root,'review.json'),'utf8'));
const supplement=JSON.parse(await readFile(join(output,'review.json'),'utf8'));
const rows=new Map(base.results.map(row=>[row.target.id,row]));
await mkdir(join(root,'thumbnails'),{recursive:true});
for(const row of supplement.results){
 rows.set(row.target.id,row);
 for(const c of row.candidates){if(c.previewFile)await writeFile(join(root,c.previewFile),await readFile(join(output,c.previewFile)));}
}
base.results=[...rows.values()];base.supplementedAt=new Date().toISOString();
await writeFile(join(root,'review.json'),JSON.stringify(base,null,2));
await writeFile(join(root,'supplement-summary.json'),JSON.stringify({atlas:atlas.length,gaps:extra.length,totalReviewTargets:base.results.length},null,2));
await rm(scratch,{recursive:true,force:true});
console.log('Supplement candidates added for review; app catalog unchanged.');
