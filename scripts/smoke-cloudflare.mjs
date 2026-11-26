import assert from 'node:assert/strict';
import https from 'node:https';
import {isIP} from 'node:net';
const base = process.argv[2];
if (!base || !(base === 'https://syllobus.com' || /^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(base))) throw new Error('Pass the deployed syllobus.com or workers.dev origin');
// Optional authoritative IP during DNS propagation; TLS still verifies the hostname.
const resolveIP=process.env.SYLLOBUS_TEST_RESOLVE_IP;
if(resolveIP && (!isIP(resolveIP)||base!=='https://syllobus.com')) throw new Error('DNS override is only supported for syllobus.com with a valid IP');
async function request(url,options={}) {
 if(!resolveIP) return fetch(url,options);
 assert.equal(new URL(url).origin,base);
 return new Promise((resolve,reject)=>{
  const req=https.request(url,{method:options.method??'GET',headers:options.headers,lookup:(_host,opts,cb)=>opts.all?cb(null,[{address:resolveIP,family:isIP(resolveIP)}]):cb(null,resolveIP,isIP(resolveIP))},res=>{
   const chunks=[];
   res.on('error',reject);res.on('data',c=>chunks.push(c));res.on('end',()=>{
    const headers=new Headers();
    for(let i=0;i<res.rawHeaders.length;i+=2) headers.append(res.rawHeaders[i],res.rawHeaders[i+1]);
    resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers}));
   });
  });
  req.setTimeout(20000,()=>req.destroy(new Error('Request timed out')));
  req.on('error',reject);req.end(options.body);
 });
}
async function session() {
 const r=await request(base+'/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
 assert.equal(r.status,200,'session initialization');
 return {id:(await r.json()).session_id,cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};
}
const owner=await session(), other=await session();
const grades=[{subject:'移行検証専用の架空科目',teacher:'',credits:2,year:2025,semester:'春学期',grade:'A',category:'選択',categoryDetail:'専門教育系科目（専門教育科目）',categorySource:'university-csv',passed:true}];
const profile={department:'経済・経営学科',admissionYear:2025,yearLevels:{2025:1},completedYear:2025,completedTerm:'春学期',complete:true};
const body={session_id:owner.id,faculty:'経済学部',grades,profile,consent:true};
const path='/api/credit-records?session_id='+owner.id;
const headers={Origin:base,'Content-Type':'application/json',Cookie:owner.cookie};
try {
 for(const method of ['GET','DELETE']) {
  const r=await request(base+path,{method,headers:{Origin:base,Cookie:other.cookie}});
  assert.equal(r.status,403,`foreign ${method}`);
 }
 let r=await request(base+'/api/credit-records',{method:'POST',headers:{...headers,Cookie:other.cookie},body:JSON.stringify(body)});
 assert.equal(r.status,403,'foreign write');
 r=await request(base+'/api/credit-records',{method:'POST',headers,body:JSON.stringify(body)});
 if(!r.ok)console.log("Save failure:", (await r.json()).error);
 assert.equal(r.status,200,`save: ${r.status}`);
 r=await request(base+path,{headers});assert.equal(r.status,200,'restore');
 assert.equal(r.headers.get('cache-control'),'private, no-store');
 assert.deepEqual((await r.json()).snapshot.grades,grades);
 for(const endpoint of ['/api/stats','/api/learning-stats?scope=department']) {
  r=await request(base+endpoint);assert.equal(r.status,200,endpoint);
  const data=await r.json();if(endpoint.includes('learning'))assert.deepEqual(data,{courses:[],pace:[],cohorts:[],trends:[]},'single test session must not appear in aggregates');
 }
 console.log('Workers smoke passed: authentication, save, restore, foreign access denied, aggregates suppressed');
} finally {
 {const r=await request(base+path,{method:'DELETE',headers});assert.equal(r.status,200,'cleanup');const verify=await request(base+path,{headers});assert.equal((await verify.json()).snapshot,null);console.log('Synthetic record deleted and deletion verified');}
}
