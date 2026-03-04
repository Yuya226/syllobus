import type { Grade } from './types';

const CREDIT_MAP: Record<string, number> = {
    '00': 2, '01': 2, '02': 2, '03': 2, '04': 2,
    '05': 2, '0A': 2, '06': 2, '07': 2, '08': 2,
    '09': 2, '10': 2, '13': 2, '19': 1,
};

function inferCredits(courseCode: string): number {
    const prefix = courseCode.substring(0, 2);
    return CREDIT_MAP[prefix] ?? 2;
}

function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields;
}

function normalizeGrade(raw: string): Grade['grade'] {
    const normalized = raw.normalize('NFKC').toUpperCase().trim();
    if (normalized === '合') return 'P';
    if (['S', 'A', 'B', 'C', 'F', 'P'].includes(normalized)) {
        return normalized as Grade['grade'];
    }
    return null;
}

/**
 * KOAN からエクスポートした Shift-JIS CSV を Grade[] に変換する。
 *
 * 列構成 (0-indexed):
 *   [5]  時間割コード
 *   [6]  開講科目名
 *   [9]  教員名
 *   [10] 修得年度
 *   [11] 評語（全角: Ａ/Ｓ/Ｂ/Ｃ/Ｆ/合）
 */
export function parseKoanCSV(buffer: ArrayBuffer): Grade[] {
    const text = new TextDecoder('shift-jis').decode(buffer);
    const lines = text.split(/\r?\n/);
    const grades: Grade[] = [];

    // 1行目はヘッダーなのでスキップ
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const fields = parseCSVLine(line);
        if (fields.length < 12) continue;

        const courseCode = fields[5]?.trim();
        const subject    = fields[6]?.trim();
        const teacher    = fields[9]?.trim() || 'Unknown';
        const yearStr    = fields[10]?.trim();
        const gradeRaw   = fields[11]?.trim();

        if (!courseCode || !/^\d{6}$/.test(courseCode)) continue;
        if (!subject) continue;

        const year = parseInt(yearStr, 10);
        if (!Number.isFinite(year)) continue;

        const grade   = normalizeGrade(gradeRaw ?? '');
        const credits = inferCredits(courseCode);

        grades.push({
            subject,
            teacher,
            semester: '前期',
            credits,
            grade,
            year,
            courseCode,
        });
    }

    return grades;
}
