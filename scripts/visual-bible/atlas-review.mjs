/** Explicit map placement review. No default Acts 1 association is published. */
const rows=`
176544969|The Holy Land: relief and terrain|Jos 1|geography
176544970|The world of the patriarchs|Gen 12,Gen 28|geography
176544971|The Exodus and conquest of Canaan: interpretive routes|Exo 12,Jos 1|geography
176544972|The twelve tribes of Israel: interpretive allotments|Jos 13|geography
176544978|The kingdoms of Saul, David and Solomon|1Sa 9,2Sa 8,1Ki 4|geography
176544975|The kingdoms of Israel and Judah|1Ki 12|geography
176544986|The prophets in Israel and Judah|Isa 1,Jer 1,Amo 1|geography
176544984|The Assyrian Empire around 700 BCE|2Ki 17,Isa 37|geography
176544981|The Babylonian Empire around 600 BCE|2Ki 25,Dan 1|geography
176544983|The Persian Empire around 450 BCE|Ezr 7,Neh 2|geography
176544963|The ministry of Jesus: geographic overview|Mat 4,Mrk 1,Luk 4|geography
176544966|Jesus' final week in Jerusalem: interpreted locations|Mat 26,Mrk 14,Luk 22,Jhn 18|reconstruction
176544965|The early spread of Christianity|Act 8|geography
176544967|Paul's missionary journeys: overview|Act 13,Act 16,Act 18,Act 27|geography
176544968|The Roman Empire and the early church|Rom 1,Act 28|geography
176543896|John 1: places in the opening chapter|Jhn 1|geography
176543895|John 2–3: places and movements|Jhn 2-3|geography
176543898|John 6: the Sea of Galilee region|Jhn 6|geography
176543899|John 7–10: geographic context|Jhn 7-10|geography
176543900|John 11–12: Bethany and Jerusalem context|Jhn 11-12|geography
176543902|The early church in the eastern Mediterranean|Act 8|geography
176543903|The early church in the western Mediterranean|Rom 15|geography
176543905|Paul's journeys across the eastern Mediterranean|Act 13|geography
176543906|Antioch on the Orontes: reconstructed city plan|Act 11|reconstruction
176543878|The Roman Empire: geographic overview|Rom 1|geography
176543907|Ancient Athens: reconstructed city plan|Act 17|reconstruction
176543908|Ancient Corinth: reconstructed city plan|Act 18|reconstruction
176543911|Ancient Ephesus: reconstructed city plan|Act 19|reconstruction
176543910|Caesarea Maritima: reconstructed city plan|Act 24|reconstruction
176543913|Ancient Rome: reconstructed city plan|Act 28|reconstruction
176543914|Acts 2: places associated with Pentecost|Act 2|geography
176543915|Acts 6: geographic context|Act 6|geography
176543921|Acts 8: movements beyond Jerusalem|Act 8|geography
176543922|Acts 9: geographic context|Act 9|geography
176543877|Divisions of the Levant in the Gospel period|Luk 3|geography
176543927|Acts 9–11: regional movements|Act 9-11|geography
176543926|Acts 11: Antioch and the expanding church|Act 11|geography
176543929|Acts 12: places in the narrative|Act 12|geography
176543931|Acts 13: the first missionary journey begins|Act 13|geography
176543933|Acts 14: places in the first journey|Act 14|geography
176543934|Acts 15: Jerusalem and neighboring regions|Act 15|geography
176543936|Acts 16: movements through Asia Minor|Act 16|geography
176543937|Acts 16–18: Macedonia and Achaia|Act 16-18|geography
176543941|Acts 18: places in Paul's travels|Act 18|geography
176543943|Acts 19–20: Ephesus and onward travel|Act 19-20|geography
176543942|Acts 21: the journey to Jerusalem|Act 21|geography
176543879|Jesus' ministry in Galilee|Mat 4|geography
176543946|Acts 23: Jerusalem to Caesarea|Act 23|geography
176543949|Acts 27: the voyage toward Rome|Act 27|geography
176543948|Acts 28: arrival in Italy and Rome|Act 28|geography
176543961|The letters: geographic overview|Rom 1|geography
176543951|Romans: geographic context|Rom 1|geography
176543952|The Corinthian letters: geographic context|1Co 1,2Co 1|geography
176543953|Galatians: geographic context|Gal 1|geography
176543954|Philippians: geographic context|Php 1|geography
176543958|Colossians: geographic context|Col 1|geography
176543957|The Thessalonian letters: geographic context|1Th 1,2Th 1|geography
176543888|Galilee to Jerusalem: interpreted ministry routes|Luk 9:51|geography
176544956|The letters to Timothy: geographic context|1Ti 1,2Ti 1|geography
176544955|Titus: Crete and its setting|Tit 1|geography
176544957|The letters of Peter: geographic context|1Pe 1,2Pe 1|geography
176544961|Revelation: the seven churches of Asia|Rev 1:11|geography
176543887|Jesus' ministry in Judea|Jhn 4|geography
176543886|Jerusalem: reconstructed Gospel-period plan|Mat 21|reconstruction
176543892|Matthew 2: places in the infancy narrative|Mat 2|geography
176543893|Luke 2: places in the infancy narrative|Luk 2|geography
176543891|Luke 24: Jerusalem and interpreted Emmaus locations|Luk 24|geography
`;
const sharedBase=new Set('176543961 176543951 176543952 176543953 176543954 176543958 176543957 176544956 176544955 176544957'.split(' '));
export const ATLAS_REVIEW=Object.fromEntries(rows.trim().split('\n').map(line=>{
 const[id,title,refs,relationship]=line.split('|');
 const caution='Routes, boundaries, dates and site identifications are editorial reconstructions and may be debated. The source legend and attribution are retained; the map is not independent evidence for every event or location.';
 const note=relationship==='reconstruction'?'An interpreted city plan for orientation; individual structures and phases must not all be assumed contemporary with the passage.':'Geographic orientation for the named passage; drawn routes and political boundaries remain approximate.';
 const passages=refs.split(',').map(ref=>{
  const match=/^(\d?[A-Za-z]{2,3}) (\d+)(?:-(\d+))?(?::(\d+))?$/.exec(ref);
  if(!match)throw new Error('Invalid reviewed atlas reference '+ref);
  return {book:match[1],chapter:Number(match[2]),...(match[3]?{endChapter:Number(match[3])}:{}),...(match[4]?{verse:Number(match[4])}:{}),relationship,note,inline:true};
 });
 return [`maps-biblica-${id}`,{title,passages,reference:refs.split(',')[0],date:'2023 edition',creator:'Biblica, Inc. / Biblica Open Study Bible Resources',sourceName:'Biblica / Wikimedia Commons',culture:'Biblical geography and historical reconstruction',medium:'Digital atlas map',technique:'map',period:'Modern biblical cartography',description:`${title}. Use the complete map and its legend to locate the regions, settlements and movements discussed in the reading.`,caution,passageNote:note,readerRank:20,workGroup:sharedBase.has(id)?'biblica-letters-shared-cartographic-base':`maps-biblica-${id}`,rightsNote:'The selected source record supplies this Biblica image under CC BY-SA 4.0. The complete map and its credit are retained. These resized WebP derivatives remain under that image license; no change to the geographical content is made.'}];
}));
ATLAS_REVIEW['maps-biblica-176544968'].caution+=' The spread of the early church extends beyond the lifetime of Paul; later periods must not be read as a first-century snapshot.';
ATLAS_REVIEW['maps-biblica-176543891'].caution+=' The location of Emmaus is disputed.';
ATLAS_REVIEW['maps-biblica-176543906'].caution+=' This is Antioch on the Orontes, not Pisidian Antioch.';
