import type { Grade } from './types';

// ===== カテゴリ定義 =====

export interface GradCategory {
    id: string;
    label: string;
    group: 'A' | 'B' | 'C';
    groupLabel: string;
    minCredits: number;
    note?: string;
    /** 自動判定が困難で手動確認が必要なカテゴリ */
    manualCheck?: boolean;
}

/**
 * 大阪大学 経済学部 2025年度以降入学者 卒業要件
 * 総卒業必要単位数: 130単位
 * 出典: 令和7(2025)年度経済学部学生便覧
 */
export const ECON_2025: GradCategory[] = [
    // A. 教養教育系科目（計 18単位）
    {
        id: 'gateway',
        group: 'A', groupLabel: '教養教育系',
        label: '学問への扉',
        minCredits: 2,
    },
    {
        id: 'lib_req',
        group: 'A', groupLabel: '教養教育系',
        label: '基盤教養（必修）',
        minCredits: 4,
        note: 'ミクロ経済学の考え方・マクロ経済学の考え方',
    },
    {
        id: 'lib_elec',
        group: 'A', groupLabel: '教養教育系',
        label: '基盤教養（選択必修）',
        minCredits: 6,
    },
    {
        id: 'info',
        group: 'A', groupLabel: '教養教育系',
        label: '情報教育',
        minCredits: 2,
        note: '情報社会基礎',
    },
    {
        id: 'sports',
        group: 'A', groupLabel: '教養教育系',
        label: '健康・スポーツ教育',
        minCredits: 2,
        note: 'スマート・スポーツリテラシー or スマート・ヘルスリテラシー',
    },
    {
        id: 'adv_lib',
        group: 'A', groupLabel: '教養教育系',
        label: '高度教養',
        minCredits: 2,
        manualCheck: true,
        note: '2年次秋以降に他学部科目等から取得',
    },

    // B. 国際性涵養教育系科目（計 18単位）
    {
        id: 'english',
        group: 'B', groupLabel: '国際性涵養系',
        label: '英語（第1外国語）',
        minCredits: 8,
        note: '総合英語6単位＋実践英語2単位',
    },
    {
        id: 'lang2',
        group: 'B', groupLabel: '国際性涵養系',
        label: '第2外国語',
        minCredits: 4,
        note: '独・仏・露・中から1言語（初級Ⅰ・Ⅱ・中級）',
    },
    {
        id: 'global',
        group: 'B', groupLabel: '国際性涵養系',
        label: 'グローバル理解',
        minCredits: 4,
        note: '第2外国語と同一言語のグローバル理解科目',
    },
    {
        id: 'adv_intl',
        group: 'B', groupLabel: '国際性涵養系',
        label: '高度国際性涵養',
        minCredits: 2,
        manualCheck: true,
        note: '2年次秋以降の選択必修Ⅱ等（○印）で充足可',
    },

    // C. 専門教育系科目（計 72単位）
    {
        id: 'spec_basic',
        group: 'C', groupLabel: '専門教育系',
        label: '専門基礎教育',
        minCredits: 4,
        note: '解析学入門・線形代数学入門（各2単位）',
    },
    {
        id: 'spec_req',
        group: 'C', groupLabel: '専門教育系',
        label: '専門必修',
        minCredits: 6,
        note: '専門セミナー（2単位）・研究セミナー（4単位）',
    },
    {
        id: 'sel1',
        group: 'C', groupLabel: '専門教育系',
        label: '選択必修Ⅰ',
        minCredits: 12,
        note: 'マクロ/ミクロ経済・経済史・経営計算システム・統計から12単位以上',
    },
    {
        id: 'sel2',
        group: 'C', groupLabel: '専門教育系',
        label: '選択必修Ⅱ',
        minCredits: 28,
        note: '財政・金融・国際経済・計量経済等から28単位以上',
    },
    {
        id: 'spec_elec',
        group: 'C', groupLabel: '専門教育系',
        label: '選択科目',
        minCredits: 22,
        note: '選択必修Ⅰ・Ⅱの超過分も算入可',
    },
];

// ===== 分類ロジック =====

/**
 * subjects テーブルの category 値 → 要件カテゴリ ID のマッピング。
 *
 * 共通教育系（全確定）:
 *   "gakumon-ss"          学問への扉
 *   "liberal-arts"        基盤教養教育科目  ※必修/選択必修は科目名でさらに判定
 *   "advanced-liberal-arts" 高度教養教育科目
 *   "advanced-seminar"    アドヴァンスト・セミナー（高度教養に充当可）
 *   "information"         情報教育科目
 *   "health-sports"       健康・スポーツ教育科目
 *   "language-1st"        マルチリンガル教育科目（第1外国語 = 英語）
 *   "language-2nd"        マルチリンガル教育科目（第2外国語）
 *   "global"              グローバル理解教育科目
 *
 * 専門科目系（subjects テーブルにカテゴリが登録されている場合に使用）:
 *   "econ-basic"          専門基礎教育科目
 *   "econ-req"            専門必修（セミナー）
 *   "econ-sel1"           選択必修Ⅰ（第2表）
 *   "econ-sel2"           選択必修Ⅱ（第3表）
 *   "econ-elec"           選択科目（第4表）
 */
const CATEGORY_TO_REQ: Record<string, string> = {
    // 共通教育
    'gakumon-ss':            'gateway',
    'advanced-liberal-arts': 'adv_lib',
    'advanced-seminar':      'adv_lib',
    'information':           'info',
    'health-sports':         'sports',
    'language-1st':          'english',
    'language-2nd':          'lang2',
    'global':                'global',
    // 専門科目（subjects テーブルに登録済みの場合）
    'econ-basic':            'spec_basic',
    'econ-req':              'spec_req',
    'econ-sel1':             'sel1',
    'econ-sel2':             'sel2',
    'econ-elec':             'spec_elec',
};

/** 選択必修Ⅰ（第2表）の科目名リスト */
const SEL1_NAMES = ['マクロ経済', 'ミクロ経済', '経済史', '経営計算システム', '統計'];

/** 選択必修Ⅱ（第3表）の科目名キーワード */
const SEL2_KEYWORDS = [
    '財政', '金融', '国際経済', '労働経済', '都市', '地域経済', '応用ミクロ',
    '経済発展', '公共経済', '計量経済', '日本経済史', '西洋経済史', '組織論',
    '経営戦略', '財務会計', 'ファイナンス', 'マーケティング', '経営科学',
    'データマイニング', '経営史', '国際経営', '財務諸表分析', '応用計量経済',
];

/**
 * SEL1 の科目名を厳密にマッチ。
 * 「上級マクロ経済」などを誤判定しないよう、キーワード直前の「上級」を除外する。
 */
function matchesSel1(name: string): boolean {
    return SEL1_NAMES.some(kw => {
        const idx = name.indexOf(kw);
        if (idx === -1) return false;
        return !/上級$/.test(name.substring(0, idx));
    });
}

/**
 * 1科目のGradeを要件カテゴリIDに分類する。
 *
 * 優先度:
 *   1. subjects テーブルの category フィールド（最高精度）
 *   2. 科目名キーワードによる判定
 *   3. コースコードプレフィックスによる判定（フォールバック）
 */
export function classifyEcon(grade: Grade): string {
    const name = grade.subject;
    const cat = grade.category ?? null;
    const prefix = (grade.courseCode ?? '').substring(0, 2);

    // ── 1. DB カテゴリ優先 ──────────────────────────────────────────────
    if (cat) {
        // "liberal-arts" は必修と選択必修が混在するため科目名で再判定
        if (cat === 'liberal-arts') {
            return /ミクロ経済学の考え方|マクロ経済学の考え方/.test(name)
                ? 'lib_req'
                : 'lib_elec';
        }
        const mapped = CATEGORY_TO_REQ[cat];
        if (mapped) return mapped;
    }

    // ── 2. 科目名キーワードフォールバック ──────────────────────────────
    if (/総合英語|実践英語/.test(name))                      return 'english';
    if (/学問への扉/.test(name))                              return 'gateway';
    if (/情報社会基礎/.test(name))                           return 'info';
    if (/スポーツリテラシー|ヘルスリテラシー/.test(name))   return 'sports';
    if (/ミクロ経済学の考え方|マクロ経済学の考え方/.test(name)) return 'lib_req';
    if (/解析学入門|線形代数学入門/.test(name))             return 'spec_basic';
    if (/専門セミナー|研究セミナー/.test(name))             return 'spec_req';

    // ── 3. コードプレフィックスフォールバック ──────────────────────────
    if (prefix === '19') {
        return /グローバル/.test(name) ? 'global' : 'lang2';
    }
    if (prefix === '13') {
        if (/英語/.test(name))     return 'english';
        if (/グローバル/.test(name)) return 'global';
        return 'lib_elec';
    }
    if (prefix === '03') {
        if (matchesSel1(name))                               return 'sel1';
        if (SEL2_KEYWORDS.some(kw => name.includes(kw)))    return 'sel2';
        return 'spec_elec';
    }

    return 'lib_elec'; // 判定不能 → 基盤教養選択に仮分類
}

// ===== 進捗計算 =====

export interface CategoryProgress {
    category: GradCategory;
    /** 修得済み単位数（Fを除く） */
    earned: number;
    /** 修得済み科目リスト */
    courses: Grade[];
    /** minCredits を充足しているか（manualCheck は常に false） */
    fulfilled: boolean;
}

export interface GraduationProgress {
    totalRequired: number; // 130
    totalEarned: number;
    byCategory: CategoryProgress[];
}

export function calcEconProgress(grades: Grade[]): GraduationProgress {
    const passed = grades.filter(g => g.grade !== 'F');

    // バケット初期化
    const buckets: Record<string, Grade[]> = {};
    for (const cat of ECON_2025) buckets[cat.id] = [];

    for (const g of passed) {
        const id = classifyEcon(g);
        // 分類先が存在しない場合（想定外）は lib_elec へ
        if (buckets[id] !== undefined) {
            buckets[id].push(g);
        } else {
            buckets['lib_elec'].push(g);
        }
    }

    const byCategory: CategoryProgress[] = ECON_2025.map(cat => {
        const courses = buckets[cat.id] ?? [];
        const earned = courses.reduce((sum, g) => sum + g.credits, 0);
        return {
            category: cat,
            earned,
            courses,
            fulfilled: cat.manualCheck ? false : earned >= cat.minCredits,
        };
    });

    // 選択科目（spec_elec）: 選択必修Ⅰ・Ⅱの超過分も算入して fulfilled を再判定
    const sel1Earned = byCategory.find(c => c.category.id === 'sel1')!.earned;
    const sel2Earned = byCategory.find(c => c.category.id === 'sel2')!.earned;
    const elecCat = byCategory.find(c => c.category.id === 'spec_elec')!;
    const overflow = Math.max(0, sel1Earned - 12) + Math.max(0, sel2Earned - 28);
    elecCat.fulfilled = elecCat.earned + overflow >= 22;

    const totalEarned = passed.reduce((sum, g) => sum + g.credits, 0);

    return { totalRequired: 130, totalEarned, byCategory };
}
