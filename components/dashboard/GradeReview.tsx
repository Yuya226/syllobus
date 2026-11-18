"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Trash2, ClipboardCheck, Plus } from "lucide-react";
import type { Grade } from "@/lib/types";
import { calculateGPA } from "@/lib/gpa";

const GRADE_OPTIONS: Grade['grade'][] = ['S', 'A', 'B', 'C', 'F', 'P'];

/** P成績が正当なカテゴリ（学問への扉・必修科目のみ） */
const P_VALID_CATEGORIES = new Set(['学問への扉', '必修科目']);

/** このGradeのP成績が確実にOCR誤認であると判断できるか */
function isSpuriousP(g: Grade): boolean {
    return g.categorySource !== 'university-csv' && g.grade === 'P' && !!g.category && !P_VALID_CATEGORIES.has(g.category);
}

interface Props {
    initialGrades: Grade[];
    onConfirm: (grades: Grade[]) => void;
    onEdited?: () => void;
}

export default function GradeReview({ initialGrades, onConfirm, onEdited }: Props) {
    const [grades, setGrades] = useState<Grade[]>(initialGrades);

    const update = (idx: number, patch: Partial<Grade>) => {
        onEdited?.();
        setGrades(prev => prev.map((g, i) => i === idx ? { ...g, ...patch, ...(g.categorySource === 'university-csv' && patch.grade ? {passed:patch.grade !== 'F'} : {}) } : g));
    };

    const remove = (idx: number) => {
        onEdited?.();
        setGrades(prev => prev.filter((_, i) => i !== idx));
    };

    const addRow = () =>
        setGrades(prev => [...prev, {
            subject: '',
            teacher: '',
            semester: null,
            credits: 2,
            grade: null,
            year: new Date().getFullYear(),
        }]);

    const earned = grades.filter(g => g.grade !== 'F' && g.grade !== null).reduce((s, g) => s + g.credits, 0);
    const hasUnknown = grades.some(g => g.grade === null);
    const hasEmptySubject = grades.some(g => !g.subject.trim());
    const previewGpa = calculateGPA(grades).cumulative;

    return (
        <div className="space-y-4">
            {/* ヘッダー */}
            <div>
                <h2 className="text-base font-semibold">読み取り結果を確認・修正</h2>
                <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>成績・単位数を確認し、誤りがあれば修正してから確定してください。</span>
                    <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />区分あり（CSVまたはDB）
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-500" />未照合
                    </span>
                </p>
            </div>

            {/* 成績未検出の警告 */}
            {hasUnknown && (
                <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded px-2 py-1.5 leading-relaxed">
                    ⚠ <span className="font-semibold">成績未入力の科目</span>があります（赤いセル）。成績を読み取れませんでした。正しい成績を選択してから確定してください。
                </p>
            )}
            {/* OCR P誤認警告（カテゴリで確定した誤認がある場合のみ表示） */}
            {grades.some(isSpuriousP) && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 leading-relaxed">
                    ⚠ <span className="font-semibold">黄色のセル</span> はOCR誤認の可能性があります（P評価にならないカテゴリの科目）。
                </p>
            )}

            {/* テーブル */}
            <div className="rounded-lg border overflow-hidden text-sm">
                {/* 列ヘッダー */}
                <div className="grid grid-cols-[1fr_56px_44px_28px] gap-x-2 px-3 py-2 bg-muted/50 text-[11px] font-medium text-muted-foreground">
                    <span>科目名</span>
                    <span className="text-center">成績</span>
                    <span className="text-center">単位</span>
                    <span />
                </div>

                {grades.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8 italic">科目がありません</p>
                )}

                {grades.map((g, i) => (
                    <div
                        key={i}
                        className={`grid grid-cols-[1fr_56px_44px_28px] gap-x-2 px-3 py-2 items-center border-t ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                    >
                        {/* 科目名 */}
                        <div className="min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                                {g.category
                                    ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                    : <AlertCircle  className="h-3 w-3 text-amber-500 shrink-0" />
                                }
                                <input
                                    type="text"
                                    value={g.subject}
                                    onChange={e => update(i, { subject: e.target.value })}
                                    placeholder="科目名を入力"
                                    className={`w-full min-w-0 truncate text-xs font-medium bg-transparent border-b focus:outline-none py-0.5 ${
                                        !g.subject.trim()
                                            ? 'border-rose-400 placeholder:text-rose-400'
                                            : 'border-transparent hover:border-border focus:border-primary'
                                    }`}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground ml-4 leading-tight">
                                {g.categorySource === 'university-csv' ? g.category : g.courseCode ?? '—'} · {g.year} {g.semester ?? ''}
                                {g.teacher && g.teacher !== 'Unknown' ? ` · ${g.teacher}` : ''}
                            </p>
                        </div>

                        {/* 成績 */}
                        <select
                            value={g.grade ?? ''}
                            onChange={e => {
                                const v = e.target.value;
                                update(i, { grade: v === '' ? null : v as Grade['grade'] });
                            }}
                            className={`h-7 w-full rounded border text-center text-xs font-bold focus:outline-none focus:ring-1 ${
                                g.grade === null
                                    ? 'border-rose-500 bg-rose-100 text-rose-700 focus:ring-rose-500'
                                    : isSpuriousP(g)
                                        ? 'border-amber-400 bg-amber-50 text-amber-700 focus:ring-amber-400'
                                        : 'border-input bg-background focus:ring-ring'
                            }`}
                        >
                            {g.grade === null && (
                                <option value="" disabled>— 要入力 —</option>
                            )}
                            {GRADE_OPTIONS.map(gr => (
                                <option key={gr} value={gr ?? ''}>{gr}</option>
                            ))}
                        </select>

                        {/* 単位数 */}
                        <input
                            type="number"
                            min={0.1} step="any"
                            max={8}
                            value={g.credits}
                            onChange={e => update(i, { credits: Math.max(0.1, Number(e.target.value)) })}
                            className="h-7 w-full rounded border border-input bg-background text-center text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />

                        {/* 削除 */}
                        <button
                            onClick={() => remove(i)}
                            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* OCR漏れ科目の手動追加 */}
            {!initialGrades.every(g=>g.categorySource==='university-csv') && <button
                onClick={addRow}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/30 transition-colors"
            >
                <Plus className="h-3.5 w-3.5" />
                科目を追加（読み取り漏れ）
            </button>}

            {/* フッター */}
            <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                    {grades.length}科目 · 修得見込み <span className="font-semibold text-foreground">{earned}</span> 単位
                    · 取込明細の参考GPA <span className="font-semibold text-foreground">{grades.some(g=>g.grade && g.grade!=='P') ? previewGpa : '対象評語なし'}</span>
                </p>
                <Button
                    className="ml-auto gap-2"
                    onClick={() => onConfirm(grades)}
                    disabled={grades.length === 0 || hasUnknown || hasEmptySubject}
                    title={hasUnknown ? '成績未入力の科目があります' : hasEmptySubject ? '科目名が未入力の行があります' : undefined}
                >
                    <ClipboardCheck className="h-4 w-4" />
                    この内容で確定
                </Button>
            </div>
        </div>
    );
}
