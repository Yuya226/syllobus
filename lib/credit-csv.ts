import type { Grade } from './types';
import { normalizeGradeCSV } from './grades';

export interface ImportInfo { kind: 'credit-status'; officialGpa?: number; warnings: string[] }
export interface CreditImport { grades: Grade[]; info: ImportInfo }

/** RFC-style quoted records, including embedded newlines and escaped quotes. */
export function csvRecords(text: string): string[][] {
    const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
            else quoted = !quoted;
        } else if (!quoted && (ch === ',' || ch === '\n' || ch === '\r')) {
            row.push(cell); cell = '';
            if (ch !== ',') { if (row.some(v => v.trim())) rows.push(row); row = []; if (ch === '\r' && text[i + 1] === '\n') i++; }
        } else cell += ch;
    }
    if (quoted) throw new Error('CSVの引用符が閉じていません。KOANから出力し直してください。');
    row.push(cell); if (row.some(v => v.trim())) rows.push(row);
    return rows;
}
const clean = (s: string) => s.normalize('NFKC').trim();
export function decodeKoan(buffer: ArrayBuffer): string {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
    catch { return new TextDecoder('shift-jis', { fatal: true }).decode(buffer); }
}

/** Header-driven import; personal identifiers, programme data and timestamps are discarded. */
export function parseCreditCSV(buffer: ArrayBuffer): CreditImport | null {
    const rows = csvRecords(decodeKoan(buffer));
    const headerIndex = rows.findIndex(r => r.map(clean).includes('科目小区分') && r.map(clean).includes('単位数'));
    if (headerIndex < 0) return null;
    const header = rows[headerIndex].map(clean);
    const required = ['科目詳細区分', '科目小区分', '開講科目名', '単位数', '修得年度', '修得学期', '評語', '合否'];
    if (required.some(k => !header.includes(k))) throw new Error('単位修得状況CSVの必須列が不足しています。元のCSVを選択してください。');
    const grades: Grade[] = []; const warnings: string[] = [];
    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        const get = (key: string) => (row[header.indexOf(key)] ?? '').trim();
        if (row.every(v => !v.trim())) continue;
        const subject = get('開講科目名'); const credits = Number(clean(get('単位数'))); const year = Number(clean(get('修得年度')));
        if (!subject || !get('単位数') || !Number.isFinite(credits) || credits <= 0 || credits > 30 || !Number.isInteger(year) || year < 1990 || year > 2100)
            throw new Error(`科目明細の${i + 1}行目を読み取れません。欠落を防ぐため取込を中止しました。元のCSVを確認してください。`);
        const grade = normalizeGradeCSV(get('評語')); const result = clean(get('合否'));
        if (!['合', '否', '不合'].includes(result)) throw new Error(`科目明細の${i + 1}行目の合否が未対応です。推測せず取込を中止しました。`);
        const passed = result === '合';
        if ((grade === 'F' && passed) || (grade && grade !== 'F' && !passed)) throw new Error(`科目明細の${i + 1}行目で評語と合否が一致しません。`);
        grades.push({ subject, teacher: '', credits, year, semester: get('修得学期') || null, grade,
            category: get('科目小区分') || null, categoryDetail: get('科目詳細区分') || null,
            categorySource: 'university-csv', passed });
    }
    if (!grades.length || grades.length > 500) throw new Error('科目明細は1〜500件で取り込めます。');
    if (grades.some(g => !g.grade)) warnings.push('未対応の評語があります。確認画面で元データと照合してください。');
    if (grades.every(g => g.passed)) warnings.push('修得済み科目の明細です。不合格科目を含む履修者全体の分布・不可率には使用しません。');
    const identities=grades.map(g=>JSON.stringify([g.subject,g.year,g.semester]));
    if(new Set(identities).size !== identities.length) warnings.push('同名・同年度・同学期の科目があります。重複か別科目かは推測せず保持しています。元のCSVと確認してください。');
    let officialGpa: number | undefined;
    const summary = rows.findIndex(r => r.map(clean).includes('通算GPA'));
    if (summary >= 0) {
        const raw = rows[summary + 1]?.[rows[summary].map(clean).indexOf('通算GPA')]?.trim();
        if (raw && Number.isFinite(Number(raw)) && Number(raw) >= 0 && Number(raw) <= 4) officialGpa = Number(raw);
    }
    return { grades, info: { kind: 'credit-status', officialGpa, warnings } };
}
