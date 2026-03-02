const { parse } = require('csv-parse/sync');

const csvTxt = `"年度","学期","時間割番"\t
"2023","前期","000001"`;

try {
    parse(csvTxt, { columns: true, skip_empty_lines: true, trim: true, delimiter: ',', relax_quotes: true, relax_column_count: true });
    console.log("Success");
} catch (e) {
    console.log("Error1:", e.code, e.message);
}

const csvTxt3 = `"年度"\t"学期"\t"時間割番"\n"2023"\t"前期"\t"000001"`;
try {
    parse(csvTxt3, { columns: true, skip_empty_lines: true, trim: true, delimiter: ',', relax_quotes: true, relax_column_count: true });
    console.log("Success 3");
} catch (e) {
    console.log("Error3:", e.code, e.message);
}

