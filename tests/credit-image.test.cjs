const test=require('node:test');
const assert=require('node:assert/strict');
const {parseCreditImages}=require('../lib/credit-image.ts');
const {universityCategory}=require('../lib/university-category.ts');
const centers=[27,232,562,1018,1401,1530,1668,1898,2150,2327,2430];
const labels=['No.','科目詳細区分','科目小区分','科目名','リーディング','高度教養','単位数','修得年度','修得学期','評語','合否'];
function word(text,x,y){return {description:text,boundingPoly:{vertices:[{x:x-15,y:y-10},{x:x+15,y:y-10},{x:x+15,y:y+10},{x:x-15,y:y+10}]}};}
function fixture({header=true,start=1,scale=1,offset=0,change={}}={}) {
 const cells=[[String(start),'専門教育系科目(専門教育科目)','選択必修1','架空経済学','','','4.0','2025','夏学期','B','合'],[String(start+1),'全学共通教育科目','学問への扉','架空の扉','','','1.0','2024','春学期','合','合']];
 for(const [key,value] of Object.entries(change)){const [r,c]=key.split(',');cells[r][c]=value;}
 const entries=[];if(header)labels.forEach((s,i)=>entries.push(word(s,centers[i],50)));
 cells.forEach((row,r)=>row.forEach((s,i)=>{if(s)entries.push(word(s,centers[i],120+r*70));}));
 return [{description:header?labels.join('\n'):'続き'},...entries.map(a=>({...a,boundingPoly:{vertices:a.boundingPoly.vertices.map(v=>({x:v.x*scale+offset,y:v.y*scale}))}}))];
}
test('credit-status OCR imports explicit categories, credits, term and pass grade without timetable codes',()=>{
 const [rows]=parseCreditImages([fixture()]);assert.equal(rows.length,2);assert.equal(rows[0].credits,4);assert.equal(rows[0].semester,'夏学期');assert.equal(rows[0].categorySource,'university-image');assert.equal(rows[0].courseCode,undefined);assert.equal(rows[1].grade,'P');assert.equal(universityCategory(rows[0],true),'sel1');
});
test('continuation supports file order, cropping offset and uniform scaling',()=>{
 const batches=parseCreditImages([fixture({header:false,start:3,scale:.55,offset:120}),fixture()]);assert.equal(batches[0].length,2);
});
test('missing headings, unreadable cells, row gaps and grade conflicts fail closed',()=>{
 assert.throws(()=>parseCreditImages([fixture({header:false})]),/列見出し/);
 for(const change of [{'0,6':''},{'0,8':''},{'0,9':'8'},{'0,10':'否'},{'1,0':'3'}])assert.throws(()=>parseCreditImages([fixture({change})]));
});
test('missing row number does not silently discard a row',()=>{
 assert.throws(()=>parseCreditImages([fixture({change:{'1,0':''}})]));
});

test('real Vision output from a generated fictional table handles split Japanese labels and multiline cells',()=>{
 const [rows]=parseCreditImages([require('./fixtures/credit-image-ocr.json')]);
 assert.equal(rows.length,3);assert.equal(rows[0].subject,'架空経済学');assert.equal(rows[1].grade,'P');assert.equal(rows[2].category,'基盤教養教育科目(必修)');
});
test('image snapshot preserves OCR provenance, strips raw fields, and uses credit requirements',()=>{
 const {sanitizeCreditSnapshot}=require('../lib/credit-snapshot.ts');
 const {EMPTY_PROFILE}=require('../lib/learning-profile.ts');
 const [grades]=parseCreditImages([fixture()]);
 const snapshot=sanitizeCreditSnapshot({grades,faculty:'経済学部',profile:{...EMPTY_PROFILE,department:'経済・経営学科'}});
 assert.ok(snapshot);assert.equal(snapshot.grades[0].categorySource,'university-image');assert.equal(snapshot.grades[0].sourceRow,undefined);
});
test('overlaps merge by visible row number; distinct identical course rows remain',()=>{
 const {mergeImageGrades}=require('../lib/merge-image-grades.ts');const [rows]=parseCreditImages([fixture()]);
 const distinct={...rows[0],sourceRow:8};assert.equal(mergeImageGrades([rows,[rows[0],distinct]]).length,3);
});
