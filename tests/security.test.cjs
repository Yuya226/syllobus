const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const auth = require('../lib/session-auth.ts');
const { validGrades } = require('../lib/validate-grades.ts');
const { calculateGPA } = require('../lib/gpa.ts');
const { parseKoanCSV } = require('../lib/csv.ts');
const { DEMO_GRADES } = require('../lib/demo.ts');
// Never contact production services in regression tests.
require.cache[require.resolve('../lib/ratelimit.ts')] = { exports: { checkRateLimit: async () => null } };
const save = require('../app/api/save-grades/route.ts');
const session = require('../app/api/session/route.ts');
const info = require('../app/api/session-info/route.ts');
const stats = require('../app/api/stats/route.ts');
const idA = '00000000-0000-4000-8000-000000000001';
const idB = '00000000-0000-4000-8000-000000000002';
process.env.WRITE_TOKEN_SECRET = 'a'.repeat(64);
function req(path, method = 'POST', body, token, origin = 'https://example.test') {
    return new NextRequest('https://example.test' + path, { method, headers: {
        origin, 'Content-Type': 'application/json', ...(token ? { cookie: 'swt=' + token } : {}),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
test('missing secret fails closed, malformed and other-session tokens rejected', () => {
    const secret = process.env.WRITE_TOKEN_SECRET;
    delete process.env.WRITE_TOKEN_SECRET;
    assert.equal(auth.ownsSession(req('/'), idA), false);
    assert.throws(() => auth.makeWriteToken(idA));
    process.env.WRITE_TOKEN_SECRET = secret;
    assert.equal(auth.ownsSession(req('/', 'GET', undefined, auth.makeWriteToken(idA)), idA), true);
    assert.equal(auth.ownsSession(req('/', 'GET', undefined, auth.makeWriteToken(idA)), idB), false);
    assert.equal(auth.ownsSession(req('/', 'GET', undefined, auth.makeWriteToken(idA) + 'junk'), idA), false);
});
test('session initialization cannot claim a client-supplied identifier', async () => {
    const response = await session.POST(req('/api/session', 'POST', { session_id: idA }));
    assert.equal(response.status, 200);
    assert.notEqual((await response.json()).session_id, idA);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
    assert.equal((await session.POST(req('/api/session','POST',{},undefined,'https://attacker.test'))).status,403);
});
test('reads, writes and deletes require ownership before any database access', async () => {
    global._supabaseAdmin = { from() { throw Error('Must not reach database'); } };
    const body = { session_id: idB, grades: DEMO_GRADES, faculty: '経済学部', consent: true };
    for (const token of [undefined, auth.makeWriteToken(idA), 'bogus']) {
        assert.equal((await save.POST(req('/api/save-grades', 'POST', body, token))).status, 403);
        assert.equal((await save.DELETE(req('/api/save-grades?session_id='+idB,'DELETE',undefined,token))).status,403);
        assert.equal((await info.GET(req('/api/session-info?session_id='+idB,'GET',undefined,token))).status,403);
    }
});
test('save requires consent, validates input, recomputes GPA and uses atomic RPC', async () => {
    const token = auth.makeWriteToken(idA);
    const body = { session_id:idA, grades:DEMO_GRADES, faculty:'経済学部', session_gpa:4, consent:true };
    assert.equal((await save.POST(req('/api/save-grades','POST',{...body,consent:false},token))).status,400);
    assert.equal((await save.POST(req('/api/save-grades','POST',{...body,grades:[{}]},token))).status,400);
    let called = false;
    global._supabaseAdmin = { rpc: async (name, args) => {
        called = true; assert.equal(name,'replace_session_grades'); assert.equal(args.target_session,idA);
        assert.equal(args.new_rows[0].session_gpa,calculateGPA(DEMO_GRADES).cumulative);
        return {error:null};
    }};
    assert.equal((await save.POST(req('/api/save-grades','POST',body,token))).status,200);
    assert.equal(called,true);
    global._supabaseAdmin = {rpc:async()=>({error:{message:'private database detail'}})};
    const failed = await save.POST(req('/api/save-grades','POST',body,token));
    assert.equal(failed.status,503); assert.doesNotMatch(JSON.stringify(await failed.json()),/private database detail/);
});
test('small aggregate and arbitrary percentile queries never disclose grades',async()=>{
    global._supabaseAdmin={rpc:async()=>({data:{totalParticipants:1,averageGpa:3.73},error:null})};
    const response=await stats.GET(req('/api/stats','GET'));
    assert.equal((await response.json()).averageGpa,0);
    assert.equal((await stats.GET(req('/api/stats?gpa=3','GET'))).status,400);
});
test('GPA includes failed credits even when the first semester grade is F; P excluded',()=>{
    const base={subject:'fixture',teacher:'',year:2025,semester:'前期',credits:2};
    const result=calculateGPA([{...base,grade:'F'},{...base,grade:'S'},{...base,grade:'P'}]);
    assert.equal(result.cumulative,2); assert.equal(result.semesters['2025 前期'],2); assert.equal(result.earnedCredits,4);
});
test('CSV rejects unrelated files and parses a synthetic compatible record',()=>{
    const bytes = text => {const b=Buffer.from(text);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
    assert.deepEqual(parseKoanCSV(bytes('not a CSV')),[]);
    const parsed=parseKoanCSV(bytes('header\n,,,,,123456,Sample Course,,,Teacher,2025,A'));
    assert.equal(parsed.length,1); assert.equal(parsed[0].grade,'A'); assert.equal(parsed[0].year,2025);
    assert.equal(validGrades([{...DEMO_GRADES[0],credits:-1}]),false);
    assert.equal(validGrades([{...DEMO_GRADES[0],grade:null}]),false);
    assert.equal(validGrades([{...DEMO_GRADES[0],grade:null}],true),true);
});
test('owner can restore and delete; restoration is never publicly cached',async()=>{
    let deletedId;
    global._supabaseAdmin={from:()=>({
        select:()=>({eq:async()=>({data:[{subject_name:'Synthetic',credits:2,grade:'A',year:2025,faculty:'経済学部',parser_version:1}],error:null})}),
        delete:()=>({eq:async(_,id)=>{deletedId=id;return {error:null}}}),
    })};
    const token=auth.makeWriteToken(idA);
    const response=await info.GET(req('/api/session-info?session_id='+idA,'GET',undefined,token));
    assert.equal(response.status,200); assert.equal((await response.json()).grades[0].subject,'Synthetic');
    assert.equal(response.headers.get('cache-control'),'private, no-store');
    assert.equal((await save.DELETE(req('/api/save-grades?session_id='+idA,'DELETE',undefined,token))).status,200);
    assert.equal(deletedId,idA);
});
test('malformed JSON does not bypass authentication',async()=>{
    const request=new NextRequest('https://example.test/api/save-grades',{method:'POST',headers:{origin:'https://example.test'},body:'{'});
    assert.equal((await save.POST(request)).status,403);
});
let annotations = [];
require.cache[require.resolve('@google-cloud/vision')] = { exports: { ImageAnnotatorClient: class { async textDetection() { return [{textAnnotations: annotations}]; } } } };
require.cache[require.resolve('../lib/subjects.ts')] = { exports: { validateAndEnrichGrades: async grades => grades } };
const analyze = require('../app/api/analyze/route.ts');
function imageRequest(bytes, type) {
    const form=new FormData(); form.set('file',new Blob([bytes],{type}),'synthetic.png');
    return new NextRequest('https://example.test/api/analyze',{method:'POST',body:form});
}
test('upload rejects non-images and images with no recognized grade table',async()=>{
    assert.equal((await analyze.POST(imageRequest('text','text/plain'))).status,400);
    assert.equal((await analyze.POST(imageRequest('text','image/png'))).status,400);
    annotations=[];
    assert.equal((await analyze.POST(imageRequest(new Uint8Array([137,80,78,71,13,10,26,10]),'image/png'))).status,400);
});
test('synthetic OCR service output reaches the review result without storing grades',async()=>{
    const word=(description,x)=>({description,boundingPoly:{vertices:[{x,y:10},{x:x+40,y:10},{x:x+40,y:20},{x,y:20}]}});
    annotations=[{description:'synthetic full text'},word('123456',0),word('Sample',80),word('2025',200),word('A',280)];
    const response=await analyze.POST(imageRequest(new Uint8Array([137,80,78,71,13,10,26,10]),'image/png'));
    assert.equal(response.status,200);
    const data=await response.json(); assert.equal(data.grades.length,1);assert.equal(data.grades[0].grade,'A');
});
test('demo categories exercise graduation progress; common-only faculties exclude unrelated credits',()=>{
    const {calcProgress,FACULTY_DEFS}=require('../lib/requirements.ts');
    const demo=calcProgress(DEMO_GRADES,FACULTY_DEFS['経済学部'],{});
    assert.ok(demo.byCategory.some(c=>c.earned>0));
    const base={subject:'Sample',teacher:'',grade:'A',year:2025,semester:null,credits:2};
    const result=calcProgress([{...base,category:'学問への扉'},{...base,subject:'Unrelated',category:null}],FACULTY_DEFS['文学部'],{});
    assert.equal(result.totalEarned,2);
});
test('same-origin accepts the incoming Host when Next normalizes its internal URL',()=>{
    const request=new NextRequest('http://localhost:3100/api/session',{headers:{host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100'}});
    assert.equal(auth.sameOrigin(request),true);
    const foreign=new NextRequest('http://localhost:3100/api/session',{headers:{host:'127.0.0.1:3100',origin:'https://attacker.test'}});
    assert.equal(auth.sameOrigin(foreign),false);
});
test('2024 economics admission retains reference calculation with cohort-specific source and checks',()=>{
    const {getGraduationReference}=require('../lib/requirements.ts');
    for(const year of [2019,2020,2021,2022,2023,2024]) {
        const reference=getGraduationReference('経済学部',year);
        assert.ok(reference); assert.equal(reference.def.totalRequired,130);
        assert.match(reference.source,/2019-2024/);
        assert.deepEqual(reference.def.groups.map(g=>g.categories.reduce((n,c)=>n+c.minCredits,0)),[18,18,72,22]);
        assert.equal(reference.def.groups.flatMap(g=>g.categories).find(c=>c.id==='sports').manualCheck,true);
    }
    assert.ok(getGraduationReference('経済学部',2025));
    assert.equal(getGraduationReference('経済学部',2018),null);
    assert.equal(getGraduationReference('文学部',2024),null);
    assert.equal(getGraduationReference('',2024),null);
});
