const {test}=require('node:test');
const assert=require('node:assert/strict');
const response=(data,count,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-range':`0-1/${count}`}});
test('recovery export paginates complete source and never treats a missing table as empty',async()=>{
 const {readAll}=await import('../scripts/export-legacy.mjs');let calls=0;
 const rows=await readAll('subjects',async()=>{calls++;return response(calls===1?[{id:1},{id:2}]:[{id:3}],3)},2);
 assert.equal(rows.length,3);assert.equal(calls,2);
 await assert.rejects(readAll('subjects',async()=>response({},0,404)),/HTTP 404/);
});
test('recovery export refuses partial, duplicated and concurrently changed pages',async()=>{
 const {readAll}=await import('../scripts/export-legacy.mjs');
 await assert.rejects(readAll('subjects',async()=>response([],1)),/incomplete/);
 await assert.rejects(readAll('subjects',async()=>response([{id:1},{id:1}],2)),/duplicate/);
 let calls=0;
 await assert.rejects(readAll('subjects',async()=>response([{id:++calls}],calls===1?2:3),1),/source changed/);
 await assert.rejects(readAll('subjects',async()=>response([{id:1,student_name:'not permitted'}],1)),/unexpected fields/);
});
