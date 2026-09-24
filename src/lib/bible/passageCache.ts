import { versePlainText } from "./verseParts";
import { identifyReaderPassage } from "./readerPassageIdentity";
import { normalizePassage, resolvePassageFromApi, type Passage } from "@/lib/bible/api";
import { PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";
import { bibleDeliveryMode } from "@/lib/bible/bibleEditions";

const DB_NAME = "yb-passages";
const STORE = "passages";
const DB_VERSION = 1;
/** Remote Scripture must be refreshed within the provider's maximum cache window. */
export const PASSAGE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export type CachedPassageRecord = { key: string; passage: Passage; cachedAt: number };

export function passageCacheKey(bibleId: string, book: string, chapter: number): string {
  // Do not revive old parser output or development bundles in a production reader.
  return `${bibleId}|${book}|${chapter}|${PASSAGE_PARSER_REVISION}|reader-integrity-v1|${bibleDeliveryMode(bibleId)}`;
}
export function isPassageCacheFresh(cachedAt: number, now = Date.now()): boolean {
  return Number.isFinite(cachedAt) && cachedAt > 0 && cachedAt <= now && now - cachedAt < PASSAGE_CACHE_MAX_AGE_MS;
}
let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "key" });
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
      req.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
    }).catch((error) => { dbPromise = null; throw error; });
  }
  return dbPromise;
}
function previousCacheKey(bibleId:string,book:string,chapter:number):string {
  return `${bibleId}|${book}|${chapter}|v11|reader-integrity-v1|${bibleDeliveryMode(bibleId)}`;
}
async function readRecord(db:IDBDatabase,key:string):Promise<CachedPassageRecord|undefined>{
  return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly"),request=tx.objectStore(STORE).get(key);request.onsuccess=()=>resolve(request.result as CachedPassageRecord|undefined);request.onerror=()=>reject(request.error);tx.onabort=()=>reject(tx.error??new Error("Cache read aborted"));});
}
async function writeRecord(db:IDBDatabase,row:CachedPassageRecord):Promise<void>{
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(row);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error("Cache write aborted"));});
}
function preserveAnnotationBaseline(passage:Passage,prior?:Passage):Passage{
  if(!prior)return passage;const previous=new Map(prior.verses.map(v=>[v.number,v]));
  return{...passage,verses:passage.verses.map(v=>{const old=previous.get(v.number);return old?{...v,annotationSourceText:old.annotationSourceText??versePlainText(old)}:v;})};
}
export async function getCachedPassage(bibleId:string,book:string,chapter:number):Promise<CachedPassageRecord|null>{
  try{
    const db=await openDb(),key=passageCacheKey(bibleId,book,chapter);let row=await readRecord(db,key);
    if(!row){
      const legacyKey=previousCacheKey(bibleId,book,chapter),legacy=await readRecord(db,legacyKey);
      if(!legacy||legacy.key!==legacyKey||!isPassageCacheFresh(legacy.cachedAt)||!legacy.passage.rawContent)return null;
      identifyReaderPassage(legacy.passage,bibleId,book,chapter);
      const reparsed=resolvePassageFromApi({reference:legacy.passage.reference,rawContent:legacy.passage.rawContent,textRevision:legacy.passage.textRevision});
      const passage=identifyReaderPassage(preserveAnnotationBaseline(reparsed,legacy.passage),bibleId,book,chapter);
      row={key,passage,cachedAt:legacy.cachedAt};await writeRecord(db,row);
    }
    if(row.key!==key||!isPassageCacheFresh(row.cachedAt))return null;
    const normalized=normalizePassage(row.passage),passage=identifyReaderPassage({...row.passage,...normalized},bibleId,book,chapter);
    return{...row,passage};
  }catch{return null;}
}
export async function setCachedPassage(bibleId:string,book:string,chapter:number,input:Passage):Promise<Passage>{
  let passage=input;
  try{
    const db=await openDb(),key=passageCacheKey(bibleId,book,chapter);
    const prior=await readRecord(db,key)??await readRecord(db,previousCacheKey(bibleId,book,chapter));
    if(prior){try{identifyReaderPassage(prior.passage,bibleId,book,chapter);passage=preserveAnnotationBaseline(input,prior.passage);}catch{/* Incorrect identity is not an annotation baseline. */}}
    await writeRecord(db,{key,passage,cachedAt:Date.now()});
  }catch{/* Storage failure cannot prevent displaying a validated passage. */}
  return passage;
}
