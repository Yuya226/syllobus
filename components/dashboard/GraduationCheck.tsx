"use client";

import { useState } from "react";
import {
    CheckCircle2, AlertCircle, HelpCircle, GraduationCap, ChevronDown, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Grade, Faculty } from "@/lib/types";
import {
    calcProgress, gradeKey,
    getGraduationReference,
    type CategoryProgress, type GradCategory, type FacultyGroupDef,
} from "@/lib/requirements";

// ── グレードバッジの色 ────────────────────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
    S: 'bg-emerald-100 text-emerald-700',
    A: 'bg-blue-100 text-blue-700',
    B: 'bg-yellow-100 text-yellow-700',
    C: 'bg-orange-100 text-orange-700',
    F: 'bg-red-100 text-red-700',
    P: 'bg-gray-100 text-gray-600',
};

// ── 科目リスト（展開時に表示）────────────────────────────────────────────────
function CourseList({ courses, emptyNote }: { courses: Grade[]; emptyNote?: string }) {
    if (courses.length === 0) {
        return (
            <p className="text-xs text-muted-foreground italic py-1">
                {emptyNote ?? '該当する科目がありません'}
            </p>
        );
    }
    return (
        <ul className="space-y-1 py-1">
            {courses.map((g, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${GRADE_COLOR[g.grade ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                        {g.grade ?? '?'}
                    </span>
                    <span className="flex-1 truncate">{g.subject}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                        {g.credits}単位
                    </span>
                </li>
            ))}
        </ul>
    );
}

// ── ステータスアイコン ─────────────────────────────────────────────────────────
function StatusIcon({ cp }: { cp: CategoryProgress }) {
    if (cp.category.manualCheck) return <HelpCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    if (cp.fulfilled)            return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />;
    return                              <AlertCircle  className="h-3.5 w-3.5 text-rose-500  shrink-0" />;
}

// ── カテゴリ行（展開可能）────────────────────────────────────────────────────
function CategoryRow({
    cp, isOpen, onToggle,
}: {
    cp: CategoryProgress;
    isOpen: boolean;
    onToggle: () => void;
}) {
    const pct = cp.category.minCredits > 0
        ? Math.min((cp.earned / cp.category.minCredits) * 100, 100)
        : 100;

    const creditColor = cp.category.manualCheck ? 'text-amber-600'
        : cp.fulfilled ? 'text-green-600' : 'text-rose-600';
    const barColor = cp.category.manualCheck ? 'bg-amber-400'
        : cp.fulfilled ? 'bg-green-500' : 'bg-rose-400';

    return (
        <div>
            <button
                onClick={onToggle}
                className="w-full text-left py-1.5 hover:bg-muted/40 rounded-md px-1 -mx-1 transition-colors"
            >
                <div className="flex items-center gap-2 mb-1">
                    <StatusIcon cp={cp} />
                    <span className="text-sm flex-1">{cp.category.label}</span>
                    <span className={`text-xs font-medium tabular-nums ${creditColor}`}>
                        {cp.category.minCredits > 0
                            ? `${cp.earned}/${cp.category.minCredits}単位`
                            : `${cp.earned}単位`}
                    </span>
                    <ChevronDown
                        className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
                {cp.category.minCredits > 0 && (
                    <div className="ml-5 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="ml-5 pl-3 border-l-2 border-dashed border-muted-foreground/20 mb-1">
                    {cp.category.note && (
                        <p className="text-[10px] text-muted-foreground mt-1 mb-0.5 leading-tight">
                            {cp.category.note}
                        </p>
                    )}
                    <CourseList
                        courses={cp.courses}
                        emptyNote={cp.category.id === 'jiyu_elec'
                            ? '各カテゴリの超過単位から自動算出されます（個別の科目は各カテゴリを参照）'
                            : undefined}
                    />
                </div>
            )}
        </div>
    );
}

// ── 未分類科目セクション ──────────────────────────────────────────────────────
function UnclassifiedSection({
    courses, overrides, onOverride, categories,
}: {
    courses: Grade[];
    overrides: Record<string, string>;
    onOverride: (key: string, catId: string) => void;
    categories: GradCategory[];
}) {
    const [isOpen, setIsOpen] = useState(true);
    if (courses.length === 0) return null;

    return (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <button
                onClick={() => setIsOpen(v => !v)}
                className="w-full flex items-center gap-2 text-xs font-semibold text-rose-700"
            >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">
                    未分類の科目（{courses.length}件）— どの要件に該当するか選んでください
                </span>
                <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <ul className="mt-2 space-y-2">
                    {courses.map(g => {
                        const key = gradeKey(g);
                        return (
                            <li key={key} className="flex items-center gap-2 text-xs">
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${GRADE_COLOR[g.grade ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {g.grade ?? '?'}
                                </span>
                                <span className="flex-1 truncate text-rose-900">{g.subject}</span>
                                <span className="shrink-0 tabular-nums text-rose-600">
                                    {g.credits}単位
                                </span>
                                <select
                                    value={overrides[key] ?? ''}
                                    onChange={e => onOverride(key, e.target.value)}
                                    className="shrink-0 rounded border border-rose-300 bg-white text-[11px] px-1 py-0.5 text-rose-900 focus:outline-none focus:ring-1 focus:ring-rose-400"
                                >
                                    <option value="">選択...</option>
                                    {categories.filter(c => !c.manualCheck).map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

// ── グループセクション ────────────────────────────────────────────────────────
function GroupSection({
    group, cats, openCats, onToggle,
}: {
    group: FacultyGroupDef;
    cats: CategoryProgress[];
    openCats: Set<string>;
    onToggle: (id: string) => void;
}) {
    const earned   = cats.reduce((s, c) => s + c.earned, 0);
    const required = cats.reduce((s, c) => s + c.category.minCredits, 0);
    const ok = earned >= required;

    return (
        <div>
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                    {group.id}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">{group.label}</span>
                <Badge
                    variant="secondary"
                    className={`ml-auto text-[10px] tabular-nums ${ok ? 'bg-green-100 text-green-700' : ''}`}
                >
                    {earned} / {required} 単位
                </Badge>
            </div>
            <div className="space-y-0 pl-3 border-l-2 border-muted">
                {cats.map(cp => (
                    <CategoryRow
                        key={cp.category.id}
                        cp={cp}
                        isOpen={openCats.has(cp.category.id)}
                        onToggle={() => onToggle(cp.category.id)}
                    />
                ))}
            </div>
        </div>
    );
}

// ── C群「準備中」プレースホルダー ────────────────────────────────────────────
function ComingSoonGroup() {
    return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 px-3 py-3">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold bg-muted text-muted-foreground rounded px-1.5 py-0.5">C</span>
                <span className="text-xs font-semibold text-muted-foreground">専門教育系</span>
                <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    準備中
                </Badge>
            </div>
            <p className="text-xs text-muted-foreground pl-1">
                専門科目の要件は未対応です。
            </p>
        </div>
    );
}

// ── 手動確認バナー ────────────────────────────────────────────────────────────
function ManualCheckBanner({ cats }: { cats: GradCategory[] }) {
    const manual = cats.filter(c => c.manualCheck);
    if (manual.length === 0) return null;
    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="font-semibold mb-0.5">
                <HelpCircle className="inline h-3 w-3 mr-0.5 align-middle" />
                手動確認が必要な科目
            </p>
            <ul className="leading-relaxed space-y-0.5">
                {manual.map(cat => (
                    <li key={cat.id}>
                        <span className="font-medium">{cat.label}（{cat.minCredits}単位）</span>
                        {cat.note && `— ${cat.note}`}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── メインコンポーネント ──────────────────────────────────────────────────────
function GraduationDetails({ grades, faculty, admissionYear }: { grades: Grade[]; faculty: Faculty | ''; admissionYear: number }) {
    const [overrides, setOverrides] = useState<Record<string, string>>({});
    const [openCats, setOpenCats] = useState<Set<string>>(new Set());

    const reference = getGraduationReference(faculty, admissionYear);
    const def = reference?.def;

    const toggle = (id: string) =>
        setOpenCats(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    const handleOverride = (key: string, catId: string) => {
        setOverrides(prev => {
            if (!catId) {
                const rest = { ...prev };
                delete rest[key];
                return rest;
            }
            return { ...prev, [key]: catId };
        });
    };

    // 学部未選択 or 未対応学部
    if (!faculty || !def) {
        return (
            <Card>
                <CardContent className="py-6 text-center space-y-1">
                    <GraduationCap className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">卒業要件チェック</p>
                    <p className="text-xs text-muted-foreground">
                        {!faculty ? '学部を選択すると表示されます' : 'この学部は現在未対応です'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const progress = calcProgress(grades, def, overrides);
    const allCategories = def.groups.flatMap(g => g.categories);
    const hasC = def.groups.some(g => g.id === 'C');

    // 合計進捗（totalRequired が設定されている学部のみ）
    const overallPct = def.totalRequired
        ? Math.min((progress.totalEarned / def.totalRequired) * 100, 100)
        : null;
    const remaining = def.totalRequired
        ? Math.max(0, def.totalRequired - progress.totalEarned)
        : null;
    const allAutoFulfilled = def.totalRequired != null
        && progress.byCategory.filter(c => !c.category.manualCheck).every(c => c.fulfilled)
        && progress.unclassified.length === 0
        && remaining === 0;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    卒業要件チェック
                </CardTitle>
                <CardDescription>
                    {faculty}（{reference?.label}
                    {def.totalRequired ? `・総 ${def.totalRequired} 単位` : '・A・B 群'}）
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
                {/* 未確認データがある場合の確認促進バナー */}
                {def.disclaimer && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <p className="font-semibold mb-0.5">
                            <HelpCircle className="inline h-3 w-3 mr-0.5 align-middle" />
                            一部未確認の項目があります
                        </p>
                        <p className="leading-relaxed">{def.disclaimer}</p>
                    </div>
                )}

                {/* 修得単位進捗バー */}
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium">
                            {def.totalRequired ? '総修得単位数' : 'A・B 群修得単位'}
                        </span>
                        <div>
                            <span className="text-2xl font-bold">{progress.totalEarned}</span>
                            {def.totalRequired && (
                                <span className="text-sm text-muted-foreground"> / {def.totalRequired} 単位</span>
                            )}
                        </div>
                    </div>
                    {overallPct != null && (
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${overallPct}%` }}
                            />
                        </div>
                    )}
                    {allAutoFulfilled ? (
                        <p className="text-xs font-medium text-green-600">参考計算上の条件を満たしています。卒業可否を保証するものではありません。</p>
                    ) : remaining != null ? (
                        <p className="text-xs text-muted-foreground">
                            あと <span className="font-bold text-foreground">{remaining}</span> 単位必要
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">専門科目（C群）は集計対象外</p>
                    )}
                </div>

                {/* 未分類科目 */}
                <UnclassifiedSection
                    courses={progress.unclassified}
                    overrides={overrides}
                    onOverride={handleOverride}
                    categories={allCategories}
                />

                {/* 各グループ */}
                {def.groups.map(group => {
                    const cats = progress.byCategory.filter(c => c.category.group === group.id);
                    return (
                        <GroupSection
                            key={group.id}
                            group={group}
                            cats={cats}
                            openCats={openCats}
                            onToggle={toggle}
                        />
                    );
                })}

                {/* C群が未定義なら「準備中」 */}
                {!hasC && <ComingSoonGroup />}

                {/* 手動確認バナー */}
                <ManualCheckBanner cats={allCategories} />

                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    ※ {reference?.label}です。詳細は入学年度に対応する学生便覧でご確認ください。
                    出典: <a href={reference?.source} target="_blank" rel="noopener noreferrer" className="underline">大学公式の卒業要件資料</a>
                </p>
            </CardContent>
        </Card>
    );
}


export default function GraduationCheck({ grades, faculty }: { grades: Grade[]; faculty: Faculty | '' }) {
    const [year, setYear] = useState('');
    const reference = getGraduationReference(faculty, Number(year));
    const uncertain = ['外国語学部', '薬学部', '基礎工学部'].includes(faculty);
    return <div className="space-y-3">
        <div className="rounded border bg-card p-4 text-sm space-y-3">
            <h3 className="font-bold">卒業要件の対応範囲</h3>
            <p>経済学部：専門科目・自由選択を含む参考計算。文学部・人間科学部・法学部・理学部・歯学部・工学部・医学部・保健学科：共通教育のみ。外国語学部・薬学部・基礎工学部：未確認・推定を含むため判定停止中。</p>
            <p>経済学部は2019〜2024年度入学者用の公式確認表と必要単位数を照合済みで、2025年度以降も参考計算を表示します。2026年度学生便覧にも「2025年度以降入学者用」の同じ確認表が掲載されています。他学部は2025年度資料が基準です。科目の読替・指定科目・外国語の内訳は別途確認が必要で、卒業可否は判定できません。</p>
            <label className="block">入学年度 <select value={year} onChange={e => setYear(e.target.value)} className="rounded border bg-background p-2"><option value="">選択してください</option><option value="older">2018年度以前（未検証）</option>{[2019, 2020, 2021, 2022, 2023, 2024].map(y => <option key={y} value={y}>{y}年度{faculty === '経済学部' ? '（参考計算）' : '（未検証）'}</option>)}<option value="2025">2025年度（参考計算）</option><option value="2026">2026年度以降{faculty === '経済学部' ? '（2025年度以降の要件・参考計算）' : '（未検証）'}</option></select></label>
            <p>最終的な卒業要件は、入学年度・学科に対応する大学公式の学生便覧で確認してください。<a href="https://www.celas.osaka-u.ac.jp/education/prerequisite/" target="_blank" rel="noopener noreferrer" className="underline">大学公式・共通教育要件</a></p>
        </div>
        {reference && !uncertain ? <GraduationDetails key={`${faculty}-${year}`} grades={grades} faculty={faculty} admissionYear={Number(year)} /> : <p className="rounded border p-4 text-sm">{uncertain ? 'この学部は未確認・推定の要件があるため、自動判定を表示していません。' : year ? 'この入学年度の要件は未検証のため、自動判定を表示していません。' : '入学年度を選択すると対応状況を確認できます。'}</p>}
    </div>;
}
