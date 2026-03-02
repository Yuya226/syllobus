const fs = require('fs');
const iconv = require('iconv-lite');

const txtUtf8 = `"年度","学期"\n"2023","前期"`;
const txtSjis = iconv.encode(txtUtf8, 'Shift_JIS');
const bufUtf8 = Buffer.from(txtUtf8, 'utf-8');

function decodeSmart(buffer) {
    try {
        // Try UTF-8 first, fatal=true means it throws if invalid bytes are found.
        const decoder = new TextDecoder('utf-8', { fatal: true });
        return decoder.decode(buffer);
    } catch (e) {
        // If it throws, it's likely Shift_JIS (standard KOAN output)
        return iconv.decode(buffer, 'Shift_JIS');
    }
}

console.log("UTF-8 decoded correctly?", decodeSmart(bufUtf8).includes('年度'));
console.log("SJIS decoded correctly?", decodeSmart(txtSjis).includes('年度'));
