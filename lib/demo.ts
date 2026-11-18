import type { Grade } from './types';
// Entirely fictional; kept only in React memory, never in production submissions.
export const DEMO_GRADES: Grade[] = [
    ['ミクロ経済学入門', 'A', 2025, '前期', '専門基礎必修'],
    ['マクロ経済学入門', 'S', 2025, '後期', '専門基礎必修'],
    ['統計学入門', 'B', 2025, '前期', '専門基礎必修'],
    ['経済史', 'A', 2026, '前期', '選択必修１'],
    ['英語リーディング', 'A', 2025, '前期', 'マルチリンガル教育科目（英語）'],
    ['英語コミュニケーション', 'B', 2025, '後期', 'マルチリンガル教育科目（英語）'],
    ['社会と文化', 'S', 2025, '前期', '基盤教養教育科目'],
    ['哲学入門', 'C', 2025, '後期', '基盤教養教育科目'],
    ['情報社会', 'P', 2026, '前期', null],
    ['数学演習', 'F', 2026, '前期', null],
].map(([subject, grade, year, semester, category]) => ({ subject, grade, year, semester, category, credits: 2, teacher: '' })) as Grade[];
