import type { Grade } from './types';
// Entirely fictional acquisition records. No identifiers, real student rows or shared statistics.
export const DEMO_GRADES: Grade[] = [
    ['架空の学問への扉', 'P', 2025, '春学期', '教養教育系科目', '学問への扉', 2],
    ['架空の基盤教養演習', 'A', 2025, '夏学期', '教養教育系科目', '基盤教養教育科目（必修）', 2],
    ['架空の社会と文化', 'S', 2025, '秋学期', '教養教育系科目', '基盤教養教育科目', 2],
    ['架空の情報教育', 'B', 2025, '冬学期', '教養教育系科目', '情報教育科目', 2],
    ['架空の外国語演習', 'B', 2025, '夏学期', '国際性涵養教育系科目', '第１外国語', 1],
    ['架空の数学基礎', 'A', 2025, '冬学期', '専門教育系科目（専門基礎教育科目）', '専門基礎教育科目（必修）', 2],
    ['架空の経済史演習', 'C', 2026, '春学期', '専門教育系科目（専門教育科目）', '選択必修１', 2],
    ['架空の金融演習', 'A', 2026, '夏学期', '専門教育系科目（専門教育科目）', '選択必修２', 4],
    ['架空の経営演習', 'S', 2026, '夏学期', '専門教育系科目（専門教育科目）', '選択', 2],
].map(([subject, grade, year, semester, categoryDetail, category, credits]) => ({ subject, grade, year, semester, categoryDetail, category, credits, teacher: '',categorySource:'university-csv',passed:true })) as Grade[];
