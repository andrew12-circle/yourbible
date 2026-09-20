import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalSourceSegments,planAnalysisBatches,validateFindingEvidence,parseFindingBatch,consolidateFindings,classifyAnalysisError} from '../supabase/functions/_shared/artifactFindingContract.ts';
import {mergePlaybackSnapshots,mergePlaybackSeconds} from '../src/lib/framework/playbackSnapshot.ts';
import {resolveFindingSource} from '../src/lib/framework/claimEvidence.ts';
const segments = [
 {id:'segment-1',text:'The speaker says this is a personal example, not a rule.',start_seconds:5400,end_seconds:5410,timing:'measured'},
 {id:'segment-2',text:'It must not be made into a rule for everyone.',start_seconds:5410,end_seconds:5420,timing:'measured'}
];
const finding = {claim:'The speaker presents a personal example rather than a universal rule.',finding_kind:'qualification',source_evidence:{segment_ids:['segment-1','segment-2'],quote:'not a rule. It must not be made into a rule for everyone.'},importance:{centrality:3,consequence:2,distinctiveness:1},importance_reason:'Preserves the qualification to the teaching.',doctrine_tags:[]};
test('all four hours, including the closing section, enter the plan',()=>{
 const rows = Array.from({length:14400},(_,i)=>({text:'source text '+i,startSeconds:i}));
 const source = canonicalSourceSegments(rows); const batches = planAnalysisBatches(source);
 assert.equal(batches.flatMap(b=>b.segments).length,14400);
 assert.equal(batches.at(-1).segments.at(-1).start_seconds,14399); assert.ok(batches.length>10);
 assert.equal(batches[1].context_before[0].id,batches[0].segments.at(-1).id);
});
test('untimed large paragraphs retain all words without invented times',()=>{
 const text='untimed word '.repeat(1500).trim(); const source=canonicalSourceSegments([{text,startSeconds:null}]);
 assert.equal(source.map(s=>s.text).join(' '),text);
 assert.ok(source.every(s=>s.start_seconds===null&&s.timing==='unavailable'));
 assert.ok(planAnalysisBatches(source).length>1);
});
test('real quotes use their source range, not a chapter estimate',()=>{
 const ev=validateFindingEvidence(finding.source_evidence,segments); assert.equal(ev.start_seconds,5400); assert.equal(ev.end_seconds,5420);
});
test('made-up quotes and reordered or missing IDs are rejected',()=>{
 assert.equal(validateFindingEvidence({...finding.source_evidence,quote:'This is a rule for absolutely everyone.'},segments),null);
 assert.equal(validateFindingEvidence({...finding.source_evidence,segment_ids:['segment-2','segment-1']},segments),null);
 assert.equal(validateFindingEvidence({...finding.source_evidence,segment_ids:['segment-1','missing']},segments),null);
});
test('malformed JSON never becomes an empty successful batch',()=>{
 assert.throws(()=>parseFindingBatch('{',segments));
 assert.throws(()=>parseFindingBatch(JSON.stringify({summary:'s',claims:[{...finding,source_evidence:{...finding.source_evidence,quote:'invented quotation'}}]}),segments));
});
test('an empty section is a valid completed result',()=>{
 assert.deepEqual(parseFindingBatch('{"summary":"Introduction only","claims":[]}',segments).findings,[]);
});
test('ranking has explicit axes and removes exact normalized duplicates',()=>{
 const batch=parseFindingBatch(JSON.stringify({summary:'s',claims:[finding]}),segments);
 assert.equal(batch.findings[0].importance_score,14); assert.equal(consolidateFindings([...batch.findings,...batch.findings]).length,1);
});
test('a finding cannot be supported only by adjacent context',()=>{
 assert.throws(()=>parseFindingBatch(JSON.stringify({summary:'s',claims:[finding]}),segments,new Set(['segment-3'])));
});
test('billing and transient rate limits have different recovery',()=>{
 assert.equal(classifyAnalysisError('429 insufficient_quota').retryable,false);
 assert.equal(classifyAnalysisError('429 rate limit').retryable,true);
 assert.equal(classifyAnalysisError('Invalid finding response schema').code,'invalid_output');
});
test('latest rewind wins even when the old position was much further forward',()=>{
 assert.deepEqual(mergePlaybackSnapshots({seconds:20,updatedAt:200},{seconds:900,updatedAt:100}),{seconds:20,updatedAt:200});
 assert.equal(mergePlaybackSeconds(0,900),0);
 assert.equal(mergePlaybackSnapshots({seconds:900,updatedAt:100},{seconds:15,updatedAt:300}).seconds,15);
});
test('display sources require exact persisted evidence, not overlapping terms',()=>{
 const rows=segments.map(s=>({id:s.id,label:'',text:s.text,startSeconds:s.start_seconds}));
 assert.equal(resolveFindingSource(undefined,rows),null);
 assert.equal(resolveFindingSource({quote_verified:true,quote:'This is a universal rule for everyone.',timing:'measured'},rows),null);
 assert.equal(resolveFindingSource({...validateFindingEvidence(finding.source_evidence,segments)},rows).startSeconds,5400);
});
test('ambiguous repeated quotations are not silently assigned to the first occurrence',()=>{
 const rows=[{id:'a',label:'',text:'The quotation is repeated in the talk.',startSeconds:10},{id:'b',label:'',text:'The quotation is repeated in the talk.',startSeconds:80}];
 const evidence={quote_verified:true,quote:rows[0].text,timing:'measured'};
 assert.equal(resolveFindingSource(evidence,rows),null);
 assert.equal(resolveFindingSource({...evidence,start_seconds:80},rows).id,'b');
});
