const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseCreditCSV}=require('../lib/credit-csv.ts');
const {classifyEcon,calcProgress,getGraduationReference}=require('../lib/requirements.ts');
const {aggregateLearning,relativeStanding}=require('../lib/learning-stats.ts');
const {sanitizeCreditSnapshot}=require('../lib/credit-snapshot.ts');
const {EMPTY_PROFILE}=require('../lib/learning-profile.ts');
const {commonReferenceDef,science2026Totals,FACULTY_CATALOG}=require('../lib/faculty-catalog.ts');
const csv='学生所属コード,学籍番号,通算ＧＰＡ,計算日時\nPRIVATE,PRIVATE-ID,2.8,PRIVATE-TIME\n年度,１学期ＧＰＡ\n2025,3\n学生所属コード,学籍番号,No.,科目詳細区分,科目小区分,開講科目名 ,単位数,修得年度,修得学期,評語,合否\nPRIVATE,PRIVATE-ID,1,教養教育系科目,基盤教養教育科目（必修）,"架空の科目,一",1.5,2025,夏学期,Ａ,合\nPRIVATE,PRIVATE-ID,2,国際性涵養教育系科目,第２外国語（ドイツ語）,"架空の科目\n二",1,2025,冬学期,合,合\n';
const bytes=s=>Uint8Array.from(Buffer.from(s)).buffer;
test('multi-section credit CSV uses university credits/categories, quoted records, and discards personal fields',()=>{
 const result=parseCreditCSV(bytes(csv));assert.equal(result.grades.length,2);assert.equal(result.info.officialGpa,2.8);
 assert.equal(result.grades[0].credits,1.5);assert.equal(result.grades[0].semester,'夏学期');assert.equal(result.grades[1].grade,'P');
 assert.equal(classifyEcon(result.grades[0]),'lib_req');assert.equal(classifyEcon(result.grades[1]),'lang2');
 assert.ok(!JSON.stringify(result).includes('PRIVATE'));assert.equal(result.grades[0].courseCode,undefined);
});
test('credit CSV never silently skips malformed course rows or fabricates absent data',()=>{
 assert.throws(()=>parseCreditCSV(bytes(csv.replace('1.5,2025','x,2025'))));
 assert.throws(()=>parseCreditCSV(bytes(csv.replace('Ａ,合','Ｆ,合'))));
 assert.throws(()=>parseCreditCSV(bytes(csv+'broken\n')));
 assert.equal(parseCreditCSV(bytes('unrelated,file\n1,2')),null);
});
const makeGrade=(grade='A')=>({subject:'Synthetic',teacher:'',category:'選択必修２',categoryDetail:'専門教育系科目（専門教育科目）',categorySource:'university-csv',passed:true,credits:2,year:2025,semester:'夏学期',grade});
const profile={...EMPTY_PROFILE,department:'経済・経営学科',admissionYear:2025,yearLevels:{2025:1},completedYear:2025,completedTerm:'夏学期',complete:true};
const snapshots=Array.from({length:20},(_,i)=>({session_id:String(i),faculty:'経済学部',profile,grades:[{...makeGrade(i<10?'A':'B'),credits:i%2?2:3}]}));
test('aggregate uses distinct sessions, suppresses small/rare/homogeneous grades, and preserves tie intervals',()=>{
 const s=aggregateLearning(snapshots);assert.equal(s.courses[0].count,20);assert.equal(s.pace[0].averageCredits,2.5);
 assert.deepEqual(relativeStanding(s.courses[0],'B'),{fromRank:11,toRank:20,topFrom:55,topTo:100,tied:10});
 assert.equal(relativeStanding(s.courses[0],'P'),null);
 assert.equal(aggregateLearning(snapshots.slice(0,19)).courses.length,0);
 assert.equal(aggregateLearning(snapshots.map(s=>({...s,grades:[makeGrade('A')]}))).courses.length,0);
 assert.equal(aggregateLearning([...snapshots,snapshots[0]]).courses[0].count,20);
 const rare=snapshots.map((s,i)=>({...s,grades:[makeGrade(i===0?'S':i<10?'A':'B')]}));assert.equal(aggregateLearning(rare).courses.length,0);
 assert.ok(!JSON.stringify(s).includes('session_id'));
});
test('pace excludes incomplete snapshots, unknown semesters and unreported year levels',()=>{
 for(const altered of [snapshots.map(s=>({...s,profile:{...profile,complete:false}})),snapshots.map(s=>({...s,profile:{...profile,yearLevels:{}}})),snapshots.map(s=>({...s,grades:[{...makeGrade(),semester:null}]}))]) assert.equal(aggregateLearning(altered).pace.length,0);
 const future=snapshots.map(s=>({...s,grades:[{...makeGrade(),semester:'冬学期'}]}));assert.equal(aggregateLearning(future).pace.length,0);
});
test('snapshot allowlist retains necessary data, strips identifiers and validates unknown fields',()=>{
 const body={faculty:'経済学部',grades:[{...makeGrade(),studentId:'PRIVATE'}],profile:{...profile,studentId:'PRIVATE'}};
 const clean=sanitizeCreditSnapshot(body);assert.ok(clean);assert.ok(!JSON.stringify(clean).includes('PRIVATE'));
 assert.equal(sanitizeCreditSnapshot({...body,profile:{...profile,yearLevels:{2025:99}}}),null);
 assert.equal(sanitizeCreditSnapshot({...body,grades:[{...makeGrade(),passed:false}]}),null);
});
test('university category maps preserve economics overflow and all faculties offer sourced partial references',()=>{
 const result=calcProgress([makeGrade()],getGraduationReference('経済学部',2025).def);
 assert.equal(result.byCategory.find(c=>c.category.id==='sel2').earned,2);
 for(const [f,c] of Object.entries(FACULTY_CATALOG)) for(const d of Object.keys(c.departments)) assert.ok(commonReferenceDef(f,d));
 assert.equal(commonReferenceDef('工学部','unknown'),null);
 assert.equal(science2026Totals(2025,'生物科学科・生物科学コース'),null);
 assert.equal(science2026Totals(2026,'生物科学科・生物科学コース').total,125);
});
test('course override identity distinguishes the same name across semesters, and P-only semesters do not fabricate GPA zero',()=>{
 const {gradeKey}=require('../lib/requirements.ts');const {calculateGPA}=require('../lib/gpa.ts');
 assert.notEqual(gradeKey(makeGrade()),gradeKey({...makeGrade(),semester:'冬学期'}));
 assert.deepEqual(calculateGPA([{...makeGrade(),grade:'P'}]).semesters,{});
});
