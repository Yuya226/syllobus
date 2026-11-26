// Explicit live OCR check: generated fictional rows only, no local grades or screenshots.
import assert from 'node:assert/strict';
import sharp from 'sharp';

const origin = process.argv[2];
assert.ok(origin === 'https://syllobus.com' || origin === 'http://localhost:3001', 'Use the production origin or local test server');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="280">
<rect width="1200" height="280" fill="white"/>
<g font-family="Arial" font-size="32" fill="black">
<text x="30" y="50">SYNTHETIC OCR TEST - FICTIONAL DATA</text>
<text x="30" y="130">987650</text><text x="240" y="130">SampleOne</text><text x="750" y="130">2025</text><text x="1020" y="130">A</text>
<text x="30" y="220">987651</text><text x="240" y="220">SampleTwo</text><text x="750" y="220">2025</text><text x="1020" y="220">B</text>
</g></svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();
async function analyze(bytes, type) {
    const form = new FormData();
    form.set('file', new Blob([bytes], { type }), 'synthetic.png');
    return fetch(`${origin}/api/analyze`, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
}
const invalid = await analyze(Buffer.from('not an image'), 'image/png');
assert.equal(invalid.status, 400, 'invalid image rejected');
const response = await analyze(png, 'image/png');
assert.equal(response.status, 200, `synthetic OCR response: ${response.status}`);
const data = await response.json();
assert.equal(data.grades.length, 2);
for (const [code, grade] of [['987650', 'A'], ['987651', 'B']]) {
    const row = data.grades.find(g => g.courseCode === code);
    assert.ok(row, 'synthetic course detected');
    assert.equal(row.grade, grade);
    assert.equal(row.year, 2025);
    assert.equal(row.semester, null, 'no invented semester');
}
console.log('Live OCR passed: invalid image rejected; two fictional rows recognized; unknown semester retained. No save API called.');
