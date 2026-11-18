import type { Grade, Faculty } from './types';

// ===== 型定義 =====

export interface GradCategory {
    id: string;
    label: string;
    group: 'A' | 'B' | 'C' | 'D';
    groupLabel: string;
    minCredits: number;
    note?: string;
    /** 自動判定が困難で手動確認が必要なカテゴリ */
    manualCheck?: boolean;
}

export interface FacultyGroupDef {
    id: 'A' | 'B' | 'C' | 'D';
    label: string;
    categories: GradCategory[];
}

export interface FacultyDef {
    groups: FacultyGroupDef[];
    /** 総卒業必要単位数（設定した場合のみ合計進捗バーを表示） */
    totalRequired?: number;
    /** subjects.category → 要件カテゴリID の上書きマッピング */
    classifyOverrides?: Record<string, string>;
    /** 科目ごとのカスタム分類関数（設定時は AB_CATEGORY_MAP より優先） */
    classifyFn?: (grade: Grade) => string | null;
    /**
     * 単位振替ルール。
     * chain: fromIds の超過分を toId に移行（fromIds は cap で丸める）。
     * catchAll: 全非manualカテゴリの超過分を集約する最終バケット。
     */
    overflowRules?: {
        chain?: Array<{ fromIds: string[]; toId: string }>;
        catchAll?: string;
    };
    /** 一部未確認項目がある場合に表示するメッセージ */
    disclaimer?: string;
}

export interface CategoryProgress {
    category: GradCategory;
    /** 修得済み単位数（F を除く） */
    earned: number;
    /** 修得済み科目リスト */
    courses: Grade[];
    /** minCredits を充足しているか（manualCheck は常に false） */
    fulfilled: boolean;
}

export interface GraduationProgress {
    totalRequired: number;
    totalEarned: number;
    byCategory: CategoryProgress[];
    /** DB カテゴリが null でユーザー未分類の科目 */
    unclassified: Grade[];
}

// ===== 定数 =====

/** 経済学部 2019〜2024年度・2025年度以降の公式確認表に基づく総卒業必要単位数 */
export const TOTAL_REQUIRED_CREDITS = 130;

// ===== ファクトリ関数 =====

const a = (id: string, label: string, minCredits: number, extra?: Partial<GradCategory>): GradCategory =>
    ({ id, group: 'A', groupLabel: '教養教育系', label, minCredits, ...extra });
const b = (id: string, label: string, minCredits: number, extra?: Partial<GradCategory>): GradCategory =>
    ({ id, group: 'B', groupLabel: '国際性涵養系', label, minCredits, ...extra });
const c = (id: string, label: string, minCredits: number, extra?: Partial<GradCategory>): GradCategory =>
    ({ id, group: 'C', groupLabel: '専門教育系', label, minCredits, ...extra });
const d = (id: string, label: string, minCredits: number, extra?: Partial<GradCategory>): GradCategory =>
    ({ id, group: 'D', groupLabel: '自由選択', label, minCredits, ...extra });

// ── 共通カテゴリ定数 ─────────────────────────────────────────────────────────
const GATEWAY    = a('gateway',    '学問への扉',          2);
const INFO       = a('info',       '情報教育',            2);
const SPORTS     = a('sports',     '健康・スポーツ教育',  2);
const ADV_LIB_MC = a('adv_lib',   '高度教養',            2, { manualCheck: true, note: '各学部便覧で確認' });
const ADV_LIB    = a('adv_lib',   '高度教養',            2);
const ADV_LIB_BE = a('adv_lib',   '高度教養',            2, { note: '基礎工学部開講科目に限る' });
const ADV_INTL   = b('adv_intl',  '高度国際性涵養',      2, { manualCheck: true });

function eng(credits: number, note?: string) { return b('english', '英語（第1外国語）', credits, note ? { note } : undefined); }
function l2 (credits: number, note?: string) { return b('lang2',   '第2外国語',        credits, note ? { note } : undefined); }
function glb(credits: number, note?: string) { return b('global',  'グローバル理解',   credits, note ? { note } : undefined); }

// ===== 学部別カテゴリ配列 =====

// ── 経済学部 ─────────────────────────────────────────────────────────────────
// 出典: 令和7(2025)年度経済学部学生便覧
const A_ECON: GradCategory[] = [
    a('gateway',  '学問への扉',          2),
    a('lib_req',  '基盤教養（必修）',    4, { note: 'ミクロ経済学の考え方・マクロ経済学の考え方' }),
    a('lib_elec', '基盤教養（選択必修）',6),
    a('info',     '情報教育',            2, { note: '情報社会基礎' }),
    a('sports',   '健康・スポーツ教育',  2),
    a('adv_lib',  '高度教養',            2, { manualCheck: true, note: '2年次秋以降に他学部科目等から取得' }),
];

const B_ECON: GradCategory[] = [
    b('english',  '英語（第1外国語）',   8, { note: '総合英語6単位＋実践英語2単位' }),
    b('lang2',    '第2外国語',           4, { note: '独・仏・露・中から1言語（初級Ⅰ・Ⅱ・中級）' }),
    b('global',   'グローバル理解',      4, { note: '第2外国語と同一言語のグローバル理解科目' }),
    b('adv_intl', '高度国際性涵養',      2, { manualCheck: true, note: '2年次秋以降の選択必修Ⅱ等（○印）で充足可' }),
];

const C_ECON: GradCategory[] = [
    c('spec_basic', '専門基礎教育',  4,  { note: '解析学入門・線形代数学入門（各2単位）' }),
    c('spec_req',   '専門必修',      6,  { note: '専門セミナー（2単位）・研究セミナー（4単位）' }),
    c('sel1',       '選択必修Ⅰ',   12,  { note: 'マクロ/ミクロ経済・経済史・経営計算システム・統計から12単位以上' }),
    c('sel2',       '選択必修Ⅱ',   28,  { note: '財政・金融・国際経済・計量経済等から28単位以上' }),
    c('spec_elec',  '選択科目',     22,  { note: '選択必修Ⅰ・Ⅱの超過分を自動算入' }),
];

const D_ECON: GradCategory[] = [
    d('jiyu_elec', '自由選択科目', 22, { note: '各カテゴリの超過単位が自動充当されます' }),
];

// ── 文学部 ───────────────────────────────────────────────────────────────────
const A_LETTERS: GradCategory[] = [
    GATEWAY,
    a('lib_base', '基盤教養教育科目', 6, { note: '人文科学系から6単位' }),
    INFO, SPORTS, ADV_LIB_MC,
];
const B_LETTERS: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(4,  '独・仏・露・中から1言語'),
    b('sel_lang', '選択外国語', 4),
    glb(8),
    ADV_INTL,
];

// ── 人間科学部 ───────────────────────────────────────────────────────────────
const A_HUMAN_SCI: GradCategory[] = [
    GATEWAY,
    a('lib_base',         '基盤教養教育科目',       6, { note: '人文科学系から6単位' }),
    INFO, SPORTS,
    a('spec_basic_celas', '専門基礎教育（CELAS）',  6),
    ADV_LIB_MC,
];
const B_HUMAN_SCI: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(4,  '独・仏・露・中から1言語'),
    b('sel_lang', '選択外国語', 3),
    glb(4),
    ADV_INTL,
];

// ── 法学部 ───────────────────────────────────────────────────────────────────
const A_LAW: GradCategory[] = [
    GATEWAY,
    a('lib_base', '基盤教養教育科目', 10),
    INFO, SPORTS, ADV_LIB_MC,
];
const B_LAW: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(4,  '独・仏・露・中から1言語'),
    glb(4),
    ADV_INTL,
];

// ── 外国語学部 ───────────────────────────────────────────────────────────────
const A_FOREIGN_S: GradCategory[] = [
    GATEWAY, INFO, SPORTS, ADV_LIB_MC,
];
const B_FOREIGN_S: GradCategory[] = [
    eng(6, '外国語学部は6単位（第2外国語・グローバル理解は専門科目で充足）'),
];

// ── 理学部 ───────────────────────────────────────────────────────────────────
const A_SCIENCE: GradCategory[] = [
    GATEWAY,
    a('lib_base', '基盤教養教育科目', 6, { note: '人文科学系から6単位' }),
    INFO, SPORTS,
];
const B_SCIENCE: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(3,  '独・仏・露・中から1言語'),
    glb(2),
];

// ── 医学部（医学科）──────────────────────────────────────────────────────────
const A_MEDICINE: GradCategory[] = [
    GATEWAY,
    a('adv_seminar', 'アドヴァンスト・セミナー', 8),
    a('lib_base',    '基盤教養教育科目',          8, { note: '自然科学系を含む' }),
    INFO, SPORTS, ADV_LIB,
];
const B_MEDICINE: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(3),
    glb(6),
];

// ── 医学部（保健学科）────────────────────────────────────────────────────────
const A_HEALTH: GradCategory[] = [
    GATEWAY,
    a('lib_base', '基盤教養＋アドヴァンスト・セミナー', 6, { note: '両カテゴリ合計6単位' }),
    INFO, SPORTS, ADV_LIB,
];
const B_HEALTH: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(3),
    glb(4),
];

// ── 歯学部 ───────────────────────────────────────────────────────────────────
const A_DENTISTRY: GradCategory[] = [
    GATEWAY,
    a('adv_seminar', 'アドヴァンスト・セミナー', 10),
    a('lib_base',    '基盤教養教育科目',          10, { note: '人文・社会各2単位以上含む' }),
    INFO, SPORTS, ADV_LIB,
];
const B_DENTISTRY: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(3),
    glb(6),
];

// ── 薬学部 ───────────────────────────────────────────────────────────────────
// 基盤教養教育科目＋アドヴァンスト・セミナー合算 6単位（CELAS 表で同一枠と推定）
const A_PHARMACY: GradCategory[] = [
    GATEWAY,
    a('lib_base', '基盤教養＋アドヴァンスト・セミナー', 6, { note: '両カテゴリ合計6単位' }),
    INFO, SPORTS, ADV_LIB,
];
const B_PHARMACY: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(3),
    glb(6),
];

// ── 工学部 ───────────────────────────────────────────────────────────────────
// PDF 確認済み：「基盤教養教育科目」及び「アドヴァンスト・セミナー」から計4単位（2～4科目）
const A_ENGINEERING: GradCategory[] = [
    GATEWAY,
    a('lib_base', '基盤教養＋アドヴァンスト・セミナー', 4, { note: '両カテゴリ合計4単位（2～4科目）' }),
    INFO, SPORTS, ADV_LIB_MC,
];
const B_ENGINEERING: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(3),
    glb(4),
];

// ── 基礎工学部 ───────────────────────────────────────────────────────────────
// 基盤教養教育科目＋アドヴァンスト・セミナー合算 6単位（CELAS 表で同一枠と推定）
const A_BASIC_ENG: GradCategory[] = [
    GATEWAY,
    a('lib_base', '基盤教養＋アドヴァンスト・セミナー', 6, { note: '両カテゴリ合計6単位' }),
    ADV_LIB_BE, INFO, SPORTS,
];
const B_BASIC_ENG: GradCategory[] = [
    eng(8, '総合英語6単位＋実践英語2単位'),
    l2(3),
    glb(2),
];

// ===== 分類マップ =====

/**
 * 全学部共通 A・B 群: subjects.category 値 → 要件カテゴリ ID のマッピング。
 * 出典: https://www.celas.osaka-u.ac.jp/education/prerequisite/
 */
export const AB_CATEGORY_MAP: Record<string, string> = {
    '学問への扉':                               'gateway',
    '基盤教養教育科目':                         'lib_base',
    'アドヴァンスト・セミナー':                 'adv_seminar',
    '高度教養教育科目':                         'adv_lib',
    '情報教育科目':                             'info',
    '健康・スポーツ教育科目':                   'sports',
    '専門基礎教育科目':                         'spec_basic_celas',
    'マルチリンガル教育科目（英語）':           'english',
    'マルチリンガル教育科目（第2外国語）':      'lang2',
    'マルチリンガル教育科目（選択外国語）':     'sel_lang',
    'グローバル理解教育科目':                   'global',
};

/**
 * 経済学部専用: subjects.category 値 → 要件カテゴリ ID のマッピング。
 * 基盤教養教育科目のみ classifyEcon 内で科目名判定（必修/選択必修の分岐）。
 */
const ECON_CATEGORY_TO_REQ: Record<string, string> = {
    // CELAS 共通教育科目
    '学問への扉':                          'gateway',
    '高度教養教育科目':                    'adv_lib',
    'アドヴァンスト・セミナー':            'jiyu_elec',
    '情報教育科目':                        'info',
    '健康・スポーツ教育科目':              'sports',
    'マルチリンガル教育科目（英語）':      'english',
    'マルチリンガル教育科目（第2外国語）': 'lang2',
    'グローバル理解教育科目':              'global',
    '専門基礎教育科目':                    'spec_basic',
    // 経済学部専門科目
    '専門基礎必修':                        'spec_basic',
    '必修科目':                            'spec_req',
    '選択必修１':                          'sel1',
    '選択必修２':                          'sel2',
    '選択科目':                            'spec_elec',
    '選択科目（実践講義）':                'jiyu_elec',
};

/**
 * 1科目の Grade を経済学部の要件カテゴリ ID に分類する。
 * 基盤教養は科目名で必修/選択必修を判別する。
 */
export function classifyEcon(grade: Grade): string | null {
    const cat = grade.category ?? null;
    if (!cat) return null;
    if (cat === '基盤教養教育科目') {
        return /ミクロ経済学の考え方|マクロ経済学の考え方/.test(grade.subject)
            ? 'lib_req'
            : 'lib_elec';
    }
    return ECON_CATEGORY_TO_REQ[cat] ?? null;
}

// ===== 学部別定義 =====

/** 学部 → 卒業要件定義 */
export const FACULTY_DEFS: Partial<Record<Faculty, FacultyDef>> = {
    // ── CELAS ページで確認済み ────────────────────────────────────────────────
    '文学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_LETTERS },
            { id: 'B', label: '国際性涵養系', categories: B_LETTERS },
        ],
    },
    '人間科学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_HUMAN_SCI },
            { id: 'B', label: '国際性涵養系', categories: B_HUMAN_SCI },
        ],
    },
    '法学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_LAW },
            { id: 'B', label: '国際性涵養系', categories: B_LAW },
        ],
    },
    '理学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_SCIENCE },
            { id: 'B', label: '国際性涵養系', categories: B_SCIENCE },
        ],
    },
    '歯学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_DENTISTRY },
            { id: 'B', label: '国際性涵養系', categories: B_DENTISTRY },
        ],
    },
    // ── 工学部: PDF（令和7年度入学者用）で単位数・合算を確認済み ─────────────
    '工学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_ENGINEERING },
            { id: 'B', label: '国際性涵養系', categories: B_ENGINEERING },
        ],
        classifyOverrides: { 'アドヴァンスト・セミナー': 'lib_base' },
    },
    // ── 経済学部: 令和7年度学生便覧で確認済み ────────────────────────────────
    '経済学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_ECON },
            { id: 'B', label: '国際性涵養系', categories: B_ECON },
            { id: 'C', label: '専門教育系',   categories: C_ECON },
            { id: 'D', label: '自由選択',     categories: D_ECON },
        ],
        totalRequired: TOTAL_REQUIRED_CREDITS,
        classifyFn: classifyEcon,
        overflowRules: {
            chain:   [{ fromIds: ['sel1', 'sel2'], toId: 'spec_elec' }],
            catchAll: 'jiyu_elec',
        },
    },
    // ── 一部未確認あり ────────────────────────────────────────────────────────
    '外国語学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_FOREIGN_S },
            { id: 'B', label: '国際性涵養系', categories: B_FOREIGN_S },
        ],
        disclaimer: 'A群の詳細な要件（基盤教養の単位数など）は確認できていません。外国語学部の学生便覧でご確認ください。',
    },
    '医学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_MEDICINE },
            { id: 'B', label: '国際性涵養系', categories: B_MEDICINE },
        ],
        disclaimer: '医学科の要件のみ対応しています。保健学科の方は「医学部（保健学科）」を選択してください。',
    },
    '医学部（保健学科）': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_HEALTH },
            { id: 'B', label: '国際性涵養系', categories: B_HEALTH },
        ],
        classifyOverrides: { 'アドヴァンスト・セミナー': 'lib_base' },
        disclaimer: '保健学科（看護学・放射線技術科学・検査技術科学専攻）の要件です。詳細は学生便覧でご確認ください。',
    },
    // ── 基盤教養＋アドヴァンスト合算単位数は推定（工学部PDFのパターンから類推）──
    '薬学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_PHARMACY },
            { id: 'B', label: '国際性涵養系', categories: B_PHARMACY },
        ],
        classifyOverrides: { 'アドヴァンスト・セミナー': 'lib_base' },
        disclaimer: '基盤教養＋アドヴァンスト・セミナーの合計単位数（6単位）は推定値です。薬学部の学生便覧でご確認ください。',
    },
    '基礎工学部': {
        groups: [
            { id: 'A', label: '教養教育系',   categories: A_BASIC_ENG },
            { id: 'B', label: '国際性涵養系', categories: B_BASIC_ENG },
        ],
        classifyOverrides: { 'アドヴァンスト・セミナー': 'lib_base' },
        disclaimer: '基盤教養＋アドヴァンスト・セミナーの合計単位数（6単位）は推定値です。基礎工学部の学生便覧でご確認ください。',
    },
};

// ===== ユーティリティ =====

/** Grade を一意に識別するキー */
export function gradeKey(grade: Grade): string {
    return `${grade.courseCode ?? grade.subject}-${grade.year}`;
}

/** 学部の総卒業必要単位数。未確認の学部は null（UI側で総数非表示） */
export function getTotalRequiredCredits(faculty: Faculty | ''): number | null {
    if (!faculty) return null;
    return FACULTY_DEFS[faculty]?.totalRequired ?? null;
}

// ===== 進捗計算 =====

/**
 * 単位振替ルールを適用する。
 * chain: fromIds の超過分を toId に移行する（fromIds は cap で丸める）。
 * catchAll: 全非manualカテゴリ（chain.fromIds・catchAll自身を除く）の超過分を集約する。
 */
function applyOverflow(
    byCategory: CategoryProgress[],
    rules: NonNullable<FacultyDef['overflowRules']>,
): void {
    const find = (id: string) => byCategory.find(c => c.category.id === id)!;

    // chain: sel1・sel2 など → spec_elec など
    const chainFromIds = new Set<string>();
    for (const { fromIds, toId } of rules.chain ?? []) {
        const toCat = find(toId);
        for (const fromId of fromIds) {
            chainFromIds.add(fromId);
            const fromCat = find(fromId);
            const overflow = Math.max(0, fromCat.earned - fromCat.category.minCredits);
            fromCat.earned = Math.min(fromCat.earned, fromCat.category.minCredits);
            toCat.earned += overflow;
        }
        toCat.fulfilled = toCat.earned >= toCat.category.minCredits;
    }

    // catchAll: 残り全カテゴリの超過分を集約
    if (rules.catchAll) {
        const catchCat = find(rules.catchAll);
        let total = catchCat.earned;
        for (const cp of byCategory) {
            if (cp.category.manualCheck) continue;
            if (cp.category.id === rules.catchAll) continue;
            if (chainFromIds.has(cp.category.id)) continue; // 既に cap 済み
            const overflow = Math.max(0, cp.earned - cp.category.minCredits);
            cp.earned = Math.min(cp.earned, cp.category.minCredits);
            total += overflow;
        }
        catchCat.earned = total;
        catchCat.fulfilled = total >= catchCat.category.minCredits;
    }
}

/**
 * 卒業要件の進捗を計算する（全学部共通）。
 *
 * @param grades   取得済み科目一覧
 * @param def      学部の卒業要件定義
 * @param overrides gradeKey → categoryId のユーザー手動分類マップ
 */
export function calcProgress(
    grades: Grade[],
    def: FacultyDef,
    overrides: Record<string, string> = {},
): GraduationProgress {
    const allCategories = def.groups.flatMap(g => g.categories);
    const passed = grades.filter(g => g.grade !== 'F' && g.grade !== null);

    // バケット初期化
    const buckets: Record<string, Grade[]> = {};
    for (const cat of allCategories) buckets[cat.id] = [];
    const unclassified: Grade[] = [];

    // 科目分類
    const classify = (grade: Grade): string | null => {
        const cat = grade.category ?? null;
        if (!cat) return null;
        if (def.classifyFn) return def.classifyFn(grade);
        return def.classifyOverrides?.[cat] ?? AB_CATEGORY_MAP[cat] ?? null;
    };

    for (const g of passed) {
        const key = gradeKey(g);
        const id = overrides[key] ?? classify(g);
        if (id !== null && buckets[id] !== undefined) {
            buckets[id].push(g);
        } else {
            unclassified.push(g);
        }
    }

    const byCategory: CategoryProgress[] = allCategories.map(cat => {
        const courses = buckets[cat.id] ?? [];
        const earned = courses.reduce((sum, g) => sum + g.credits, 0);
        return {
            category: cat,
            earned,
            courses,
            fulfilled: cat.manualCheck ? false : earned >= cat.minCredits,
        };
    });

    // 単位振替
    if (def.overflowRules) {
        applyOverflow(byCategory, def.overflowRules);
    }

    const totalEarned = def.totalRequired != null
        ? passed.reduce((sum, g) => sum + g.credits, 0)
        : byCategory.reduce((sum, category) => sum + category.earned, 0);
    return {
        totalRequired: def.totalRequired ?? 0,
        totalEarned,
        byCategory,
        unclassified,
    };
}


/** Cohort-specific reference display; does not certify graduation eligibility. */
export function getGraduationReference(faculty: Faculty | '', admissionYear: number) {
    const def = faculty ? FACULTY_DEFS[faculty] : undefined;
    if (!def || !Number.isInteger(admissionYear)) return null;
    if (faculty === '経済学部' && admissionYear >= 2019 && admissionYear <= 2024) {
        return {
            label: '2019〜2024年度入学者・参考計算',
            source: 'https://www.econ.osaka-u.ac.jp/wp-content/uploads/2025/03/sotsugyo-2019-2024.pdf',
            def: {
                ...def,
                groups: def.groups.map(group => ({ ...group, categories: group.categories.map(category =>
                    category.id === 'sports' ? { ...category, manualCheck: true, note: 'スポーツ実習Aの修得を公式確認表・成績証明書で確認してください。' } : category
                ) })),
                disclaimer: '公式の2019〜2024年度入学者用確認表と主要区分の必要単位数を照合しています。科目の読替・外国語の内訳・指定科目の修得は別途確認が必要です。科目分類は推定を含む参考値です。編入・転部の場合は適用される便覧を確認してください。',
            },
        };
    }
    // The official 2026 handbook repeats the table for entrants from 2025 onward.
    if (faculty === '経済学部' && admissionYear >= 2025) return {
        label: '2025年度以降入学者・参考計算',
        source: 'https://www.econ.osaka-u.ac.jp/wp-content/uploads/2025/03/sotsugyo-2025-.pdf',
        def: { ...def, disclaimer: '2026年度学生便覧に掲載された「2025年度以降入学者用」の確認表に基づきます。教養18・国際性涵養18・専門基礎と専門教育72・自由選択22の計130単位です。科目分類・読替・指定科目・外国語の内訳は別途確認してください。将来の改訂や編入・転部の適用要件は大学公式資料を優先してください。' },
    };
    if (admissionYear === 2025) return {
        label: '2025年度資料による参考表示',
        source: 'https://www.celas.osaka-u.ac.jp/education/prerequisite/',
        def,
    };
    return null;
}
