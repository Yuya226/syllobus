"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, BookOpen, AlertCircle, GraduationCap, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { CourseResult, CoursesResponse, GradeDist } from "@/app/api/courses/route";

type SortKey = 'year_desc' | 'year_asc' | 'sa_rate' | 'fail_rate' | 'count';

function GradeBar({ dist, total }: { dist: GradeDist; total: number }) {
    const segments: { key: keyof GradeDist; color: string; label: string }[] = [
        { key: 'S', color: 'bg-emerald-500', label: 'S' },
        { key: 'A', color: 'bg-blue-500',    label: 'A' },
        { key: 'B', color: 'bg-yellow-400',  label: 'B' },
        { key: 'C', color: 'bg-orange-400',  label: 'C' },
        { key: 'F', color: 'bg-red-500',     label: 'F' },
        { key: 'P', color: 'bg-teal-400',    label: 'P' },
    ];
    return (
        <div className="mt-1.5 space-y-1">
            <div className="flex h-2 w-full rounded-full overflow-hidden gap-px">
                {segments.map(({ key, color }) =>
                    dist[key] > 0 ? (
                        <div key={key} className={`${color} transition-all`} style={{ width: `${dist[key] * 100}%` }} />
                    ) : null
                )}
            </div>
            <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
                {segments.map(({ key, color, label }) =>
                    dist[key] > 0 ? (
                        <span key={key} className="flex items-center gap-0.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-sm ${color}`} />
                            {label} {Math.round(dist[key] * 100)}%
                        </span>
                    ) : null
                )}
                <span className="ml-auto">{total}件</span>
            </div>
        </div>
    );
}

const DETAIL_SEGMENTS: { key: keyof GradeDist; color: string; label: string }[] = [
    { key: 'S', color: 'bg-emerald-500', label: 'S' },
    { key: 'A', color: 'bg-blue-500',    label: 'A' },
    { key: 'B', color: 'bg-yellow-400',  label: 'B' },
    { key: 'C', color: 'bg-orange-400',  label: 'C' },
    { key: 'F', color: 'bg-red-500',     label: 'F' },
    { key: 'P', color: 'bg-teal-400',    label: 'P' },
];

function CourseDetailModal({ course, onClose }: { course: CourseResult; onClose: () => void }) {
    const dist = course.gradeDist;
    const total = course.totalCount ?? 0;
    const saRate = dist ? Math.round((dist.S + dist.A) * 100) : null;
    const failRate = dist ? Math.round(dist.F * 100) : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-lg bg-card border shadow-xl p-5 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-base font-bold leading-snug">{course.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                            {course.year && <span>{course.year}年度</span>}
                            {course.teacher && <span>{course.teacher}</span>}
                            {course.credits && <span>{course.credits}単位</span>}
                            {course.semester && <span>{course.semester}</span>}
                            {course.code && <span className="font-mono">{course.code}</span>}
                            {course.category && <span>{course.category}</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors" aria-label="閉じる">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {dist && total > 0 ? (
                    <>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-md bg-muted/50 py-2">
                                <p className="text-lg font-bold text-emerald-600">{saRate}%</p>
                                <p className="text-[10px] text-muted-foreground">S+A率</p>
                            </div>
                            <div className="rounded-md bg-muted/50 py-2">
                                <p className="text-lg font-bold text-red-600">{failRate}%</p>
                                <p className="text-[10px] text-muted-foreground">不可率</p>
                            </div>
                            <div className="rounded-md bg-muted/50 py-2">
                                <p className="text-lg font-bold">{total}</p>
                                <p className="text-[10px] text-muted-foreground">データ数</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            {DETAIL_SEGMENTS.map(({ key, color, label }) => {
                                const rate = dist[key];
                                if (rate <= 0) return null;
                                return (
                                    <div key={key} className="flex items-center gap-2 text-xs">
                                        <span className="w-4 font-bold">{label}</span>
                                        <div className="flex-1 h-3 bg-secondary rounded-sm overflow-hidden">
                                            <div className={`h-full ${color} transition-all`} style={{ width: `${rate * 100}%` }} />
                                        </div>
                                        <span className="w-16 text-right tabular-nums text-muted-foreground">
                                            {Math.round(rate * 100)}%（約{Math.round(rate * total)}セッション）
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            ※ ユーザーがアップロードした成績データに基づく分布です。実際の成績分布（参考値・10セッション以上）とは異なる場合があります。
                        </p>
                    </>
                ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">この科目の成績データはまだありません。</p>
                )}
            </div>
        </div>
    );
}

function CourseCard({ course, onClick }: { course: CourseResult; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left rounded-md border border-transparent px-3 py-3 hover:border-border hover:bg-muted/45 transition-colors cursor-pointer"
        >
            <p className="text-sm font-semibold truncate">{course.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {course.year && <span className="text-xs text-muted-foreground">{course.year}年度</span>}
                {course.teacher && <span className="text-xs text-muted-foreground">{course.teacher}</span>}
                {course.credits && <span className="text-xs text-muted-foreground">{course.credits}単位</span>}
                {course.semester && <span className="text-xs text-muted-foreground">{course.semester}</span>}
                {course.code && <span className="text-xs text-muted-foreground font-mono">{course.code}</span>}
            </div>
            {course.gradeDist && course.totalCount ? (
                <GradeBar dist={course.gradeDist} total={course.totalCount} />
            ) : (
                <p className="text-[10px] text-muted-foreground mt-1">成績分布は未取得またはプライバシー保護のため非公開</p>
            )}
        </button>
    );
}

function SkeletonRows({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-4 px-2">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="space-y-1.5 animate-pulse">
                    <div className="h-3 w-2/3 bg-muted rounded" />
                    <div className="h-2 w-full bg-muted rounded-full" />
                </div>
            ))}
        </div>
    );
}

const LIMIT = 30;
const YEARS = [2026, 2025, 2024];

export default function CourseSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CourseResult[]>([]);
    const [total, setTotal] = useState(0);
    const [yearCounts, setYearCounts] = useState<Record<number, number>>({});
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('sa_rate');
    const [yearFilter, setYearFilter] = useState<number | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<CourseResult | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!selectedCourse) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedCourse(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedCourse]);

    const isSearchMode = query.trim().length > 0;

    const fetchResults = useCallback(async (q: string, p: number, year: number | null, sort: SortKey) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), sort });
            if (q) params.set('q', q);
            if (year) params.set('year', String(year));
            const res = await fetch(`/api/courses?${params}`);
            if (!res.ok) throw new Error('検索に接続できません');
            const data = await res.json() as CoursesResponse;
            setResults(data.results);
            setTotal(data.total);
            setYearCounts(data.yearCounts ?? {});
            setPage(p);
        } catch {
            setResults([]);
            setTotal(0);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    }, []);

    // Debounce input; one effect owns requests for query, year and sort changes.
    useEffect(() => {
        debounceRef.current = setTimeout(() => {
            fetchResults(query.trim(), 0, yearFilter, sortKey);
        }, query.trim() ? 300 : 0);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, yearFilter, sortKey, fetchResults]);

    const handleYearFilter = (year: number | null) => {
        setYearFilter(year);

    };

    const handleSort = (key: SortKey) => {
        setSortKey(key);

    };

    return (
        <div className="space-y-4">
            {/* 検索バー */}
            <div className="relative rounded-md border bg-card p-2 shadow-sm">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="科目名 or 時間割コードで検索…"
                    className="w-full h-11 rounded border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {isSearchMode
                            ? <><GraduationCap className="h-4 w-4 text-primary" />検索結果</>
                            : <><BookOpen className="h-4 w-4 text-primary" />成績データがある科目</>
                        }
                    </CardTitle>
                    {!loading && searched && isSearchMode && (
                        <CardDescription>「{query.trim()}」— {total}件</CardDescription>
                    )}
                </CardHeader>

                {/* フィルター・ソート */}
                <div className="px-6 pb-3 space-y-2">
                    <div className="flex gap-1 flex-wrap">
                        <button
                            onClick={() => handleYearFilter(null)}
                            className={`text-xs px-2.5 py-1 rounded-md border font-semibold transition-colors ${yearFilter === null ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-input hover:bg-muted'}`}
                        >
                            すべての年度
                            {Object.keys(yearCounts).length > 0 && (
                                <span className="ml-1 opacity-70">{Object.values(yearCounts).reduce((a, b) => a + b, 0)}</span>
                            )}
                        </button>
                        {YEARS.map(y => (
                            <button
                                key={y}
                                onClick={() => handleYearFilter(y)}
                                className={`text-xs px-2.5 py-1 rounded-md border font-semibold transition-colors ${yearFilter === y ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-input hover:bg-muted'}`}
                            >
                                {y}年度
                                {yearCounts[y] != null && (
                                    <span className="ml-1 opacity-70">{yearCounts[y]}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex gap-1 flex-wrap">
                            {([['sa_rate', 'S+A率順'], ['fail_rate', '不可率順'], ['count', 'データ数順'], ['year_desc', '新しい順'], ['year_asc', '古い順']] as [SortKey, string][]).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => handleSort(key)}
                                    className={`text-xs px-2.5 py-1 rounded-md border font-semibold transition-colors ${sortKey === key ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-input hover:bg-muted'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {!loading && total > LIMIT && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">
                                    {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} / {total}件
                                </span>
                                <button
                                    onClick={() => fetchResults(isSearchMode ? query.trim() : '', page - 1, yearFilter, sortKey)}
                                    disabled={page === 0}
                                    className="p-1 rounded-md border disabled:opacity-30 hover:bg-muted transition-colors"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => fetchResults(isSearchMode ? query.trim() : '', page + 1, yearFilter, sortKey)}
                                    disabled={(page + 1) * LIMIT >= total}
                                    className="p-1 rounded-md border disabled:opacity-30 hover:bg-muted transition-colors"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <CardContent>
                    {loading && <SkeletonRows />}

                    {!loading && searched && isSearchMode && results.length === 0 && (
                        <div className="py-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
                            <AlertCircle className="h-7 w-7 opacity-40" />
                            <p className="text-sm font-medium">該当する科目が見つかりません</p>
                            <p className="text-xs">別のキーワードで試してみてください。</p>
                        </div>
                    )}

                    {!loading && !isSearchMode && results.length === 0 && (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            まだデータがありません。成績をアップロードすると表示されます。
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                            <div className="grid sm:grid-cols-2 gap-2">
                            {results.map(course => (
                                <CourseCard key={course.id} course={course} onClick={() => setSelectedCourse(course)} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedCourse && (
                <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
            )}
        </div>
    );
}
