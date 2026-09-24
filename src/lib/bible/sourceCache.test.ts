import { IDBFactory } from 'fake-indexeddb';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const now=Date.now(),legacyKey='abc|Mat|5|v11|reader-integrity-v1|unsupported';
const rawContent='<p class="qc"><span class="v">3</span><span class="wj">First line.</span></p><p class="qc"><span class="wj">Second line.</span></p>';
async function seed(cachedAt=now,raw:string|undefined=rawContent,reference='Matthew 5'){
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('yb-passages',1);r.onupgradeneeded=()=>r.result.createObjectStore('passages',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 await new Promise<void>((resolve,reject)=>{const t=db.transaction('passages','readwrite');t.objectStore('passages').put({key:legacyKey,cachedAt,passage:{reference,rawContent:raw,verses:[{number:3,text:'First line.'}],paragraphStarts:[3],headings:[]}});t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});db.close();
}
beforeEach(()=>{vi.resetModules();vi.stubGlobal('indexedDB',new IDBFactory());vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Provider requests blocked'));});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('local source cache upgrade',()=>{
 it('reparses locally without resetting age or discarding the old annotation baseline',async()=>{await seed();const {getCachedPassage}=await import('./passageCache');const row=await getCachedPassage('abc','Mat',5);expect(row?.passage.verses[0].text).toBe('First line. Second line.');expect(row?.cachedAt).toBe(now);expect(row?.passage.verses[0].annotationSourceText).toBe('First line.');expect(row?.passage.rawContent).toBe(rawContent);expect(fetch).not.toHaveBeenCalled();expect((await getCachedPassage('abc','Mat',5))?.passage.verses[0].text).toBe(row?.passage.verses[0].text);});
 it('rejects another chapter identity',async()=>{await seed(now,rawContent,'John 5');const {getCachedPassage}=await import('./passageCache');expect(await getCachedPassage('abc','Mat',5)).toBeNull();});
 it('does not renew expired source through migration',async()=>{await seed(now-31*86400000);const {getCachedPassage}=await import('./passageCache');expect(await getCachedPassage('abc','Mat',5)).toBeNull();expect(fetch).not.toHaveBeenCalled();});
 it('does not pretend parsed-only records contain discarded text',async()=>{await seed(now,'');const {getCachedPassage}=await import('./passageCache');expect(await getCachedPassage('abc','Mat',5)).toBeNull();expect(fetch).not.toHaveBeenCalled();});
});
