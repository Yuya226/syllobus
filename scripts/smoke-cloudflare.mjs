import assert from 'node:assert/strict';
const base = process.argv[2];
if (!base || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(base)) throw new Error('Pass the deployed workers.dev origin');
async function session() {
 const r=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
 assert.equal(r.status,200,'session initialization');
 return {id:(await r.json()).session_id,cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};
}
const owner=await session(), other=await session();
const grades=[{subject:'移行検証専用の架空科目',teacher:'',credits:2,year:2025,semester:'春学期',grade:'A',category:'選択',categoryDetail:'専門教育系科目（専門教育科目）',categorySource:'university-csv',passed:true}];
const profile={department:'',admissionYear:null,yearLevels:{},completedYear:null,completedTerm:'',complete:false};
const body={session_id:owner.id,faculty:'経済学部',grades,profile,consent:true};
const path='/api/credit-records?session_id='+owner.id;
const headers={Origin:base,'Content-Type':'application/json',Cookie:owner.cookie};
try {
 for(const method of ['GET','DELETE']) {
  const r=await fetch(base+path,{method,headers:{Origin:base,Cookie:other.cookie}});
  assert.equal(r.status,403,`foreign ${method}`);
 }
 let r=await fetch(base+'/api/credit-records',{method:'POST',headers:{...headers,Cookie:other.cookie},body:JSON.stringify(body)});
 assert.equal(r.status,403,'foreign write');
 r=await fetch(base+'/api/credit-records',{method:'POST',headers,body:JSON.stringify(body)});
 if(!r.ok)console.log("Save failure:", (await r.json()).error);
 assert.equal(r.status,200,`save: ${r.status}`);
 r=await fetch(base+path,{headers});assert.equal(r.status,200,'restore');
 assert.equal(r.headers.get('cache-control'),'private, no-store');
 assert.deepEqual((await r.json()).snapshot.grades,grades);
 for(const endpoint of ['/api/stats','/api/learning-stats']) {
  r=await fetch(base+endpoint);assert.equal(r.status,200,endpoint);
  const data=await r.json();if(endpoint.includes('learning'))assert.deepEqual(data,{courses:[],pace:[],trends:[]},'single test session must not appear in aggregates');
 }
 console.log('Workers smoke passed: authentication, save, restore, foreign access denied, aggregates suppressed');
} finally {
 {const r=await fetch(base+path,{method:'DELETE',headers});assert.equal(r.status,200,'cleanup');const verify=await fetch(base+path,{headers});assert.equal((await verify.json()).snapshot,null);console.log('Synthetic record deleted and deletion verified');}
}
