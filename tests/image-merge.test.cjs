const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mergeImageGrades}=require('../lib/merge-image-grades.ts');

test('overlapping screenshots remove exact duplicates but retain different terms and OCR conflicts for review',()=>{
    const spring={subject:'架空の演習',teacher:'',year:2025,semester:'春学期',credits:2,grade:'A',courseCode:'123456'};
    const autumn={...spring,semester:'秋学期'};
    const conflict={...spring,grade:'B'};
    const ungraded={...spring,grade:'P'};
    assert.deepEqual(mergeImageGrades([[spring],[{...spring},autumn,conflict,ungraded]]),[spring,autumn,conflict,ungraded]);
    const noCode={...spring,courseCode:undefined};
    assert.equal(mergeImageGrades([[noCode],[{...noCode,semester:'秋学期'}]]).length,2);
});
