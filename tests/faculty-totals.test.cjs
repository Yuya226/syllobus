const {test}=require('node:test');
const assert=require('node:assert/strict');
const {facultyTotals,compareFacultyTotals,creditBucket}=require('../lib/faculty-totals.ts');
const g=(category,credits,extra={})=>({subject:'架空科目',teacher:'',year:2026,semester:'春学期',grade:'A',passed:true,categorySource:'university-csv',category,credits,...extra});
test('science applicability is explicit per cohort, never extends into the future',()=>{
 for(const year of [2024,2025,2026]) {const r=facultyTotals('理学部','数学科',year); assert.ok(r.verifiedYears.includes(year));assert.equal(r.total,124);assert.match(r.source,/\.pdf$/);}
 for(const year of [2023,2027,0]) assert.ok(!facultyTotals('理学部','数学科',year).verifiedYears.includes(year));
 assert.equal(facultyTotals('理学部','存在しない学科',2026),null);
 assert.equal(facultyTotals('工学部','応用自然科学科',2024).verifiedYears.length,0);
});
test('advanced rows overlap in science but are not counted twice in totals',()=>{
 const grades=[g('高度教養教育科目',2),g('基盤教養教育科目',12),g('高度国際性涵養教育科目',1)];
 const c=compareFacultyTotals(grades,facultyTotals('理学部','物理学科',2026));
 assert.equal(c.rows[0].earned,14);assert.equal(c.rows[4].earned,2);assert.equal(c.total,15);
 assert.equal(c.rows[3].minimum,14);assert.equal(c.rows[5].minimum,1);
 const eng=compareFacultyTotals(grades,facultyTotals('工学部','応用自然科学科',2026));
 assert.equal(eng.rows[0].earned,12);assert.equal(eng.rows[3].earned,0);assert.equal(eng.total,15);
});
test('unknown, excluded and failed credits never become specialized credits by inference',()=>{
 const r=facultyTotals('理学部','化学科',2026);
 const c=compareFacultyTotals([
  g('必修',2,{categoryDetail:'専門教育系科目（専門教育科目）'}),
  g('必修',6,{categoryDetail:'専門教育系科目'}),
  g('教職',2,{categoryDetail:'専門教育系科目（専門教育科目）'}),
  g('専門基礎教育科目',4,{grade:'F'}),g('専門基礎教育科目',4,{passed:false}),
  g('高度教養教育科目',2,{categorySource:undefined}),g('専門基礎教育科目',NaN),
 ],r);
 assert.equal(c.total,2);assert.equal(c.unassigned,3);assert.equal(c.rows[2].earned,2);
 assert.equal(creditBucket(g('数学の専門科目',2)),null);
});
test('minimum subtotal does not replace required overall credits',()=>{
 const r=facultyTotals('理学部','生物科学科・生命理学コース',2025);
 assert.equal(r.rows.slice(0,4).reduce((s,r)=>s+r.minimum,0),120);assert.equal(r.total,125);
});
test('basic engineering requires a course and rejects a course from another department',()=>{
 assert.equal(facultyTotals('基礎工学部','システム科学科',2026),null);
 assert.equal(facultyTotals('基礎工学部','システム科学科',2026,'合成化学コース'),null);
 const bio=facultyTotals('基礎工学部','システム科学科',2026,'生物工学コース');
 assert.equal(bio.rows[1].minimum,82);assert.equal(bio.total,undefined);
 const mechanical=facultyTotals('基礎工学部','システム科学科',2026,'機械科学コース');
 assert.equal(mechanical.rows[1].minimum,78);
});
