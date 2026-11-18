const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseKoanCSV}=require('../lib/csv.ts');
const {enrichForReview,ENRICHMENT_WARNING}=require('../lib/enrich-for-review.ts');
const fixture=Buffer.from('header\n,,,,,999999,Synthetic CSV course,,,Teacher,2024,A');
const grades=parseKoanCSV(fixture.buffer.slice(fixture.byteOffset,fixture.byteOffset+fixture.byteLength));
test('CSV reading survives unavailable enrichment without dropping parsed grades',async()=>{
    for(const status of [400,429,500,503]) {
        const result=await enrichForReview(grades,{fetcher:async()=>Response.json({error:'Unavailable'},{status})});
        assert.deepEqual(result.grades,grades); assert.equal(result.warning,ENRICHMENT_WARNING);
    }
});
test('CSV enrichment deadline covers an indefinitely stalled response',async()=>{
    let signal;
    const result=await enrichForReview(grades,{timeoutMs:10,fetcher:async(_,options)=>{signal=options.signal;return new Promise(()=>{});}});
    assert.equal(signal.aborted,true); assert.deepEqual(result.grades,grades);assert.ok(result.warning);
});
test('invalid enrichment response preserves the CSV; valid response keeps supplemented credits',async()=>{
    for(const body of [{}, {grades:[]}, {grades:[{}]}]) {
        const result=await enrichForReview(grades,{fetcher:async()=>Response.json(body)});
        assert.deepEqual(result.grades,grades); assert.ok(result.warning);
    }
    const supplemented=grades.map(g=>({...g,credits:4,category:'選択科目'}));
    const result=await enrichForReview(grades,{fetcher:async()=>Response.json({grades:supplemented})});
    assert.equal(result.grades[0].credits,4);assert.equal(result.warning,undefined);
});
test('a failed subject query is not reported as successful CSV enrichment',async()=>{
    const {validateAndEnrichGrades}=require('../lib/subjects.ts');
    global._supabaseAdmin={from:()=>({select:()=>({in:async()=>({data:null,error:{message:'unavailable'}})})})};
    await assert.rejects(()=>validateAndEnrichGrades(grades,{requireLookup:true}),/Subject lookup unavailable/);
});
