"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, BookOpen, AlertCircle, GraduationCap } from "lucide-react";
import type { CourseResult, GradeDist } from "@/app/api/courses/route";

type SortKey = 'year_desc' | 'year_asc' | 'sa_rate';

function sortResults(results: CourseResult[], key: SortKey): CourseResult[] {
    return [...results].sort((a, b) => {
        if (key === 'year_desc') return (b.year ?? 0) - (a.year ?? 0);
        if (key === 'year_asc')  return (a.year ?? 0) - (b.year ?? 0);
        // sa_rate: データなしを末尾に
        const sa = (d: GradeDist | null) => d ? d.S + d.A : -1;
        return sa(b.gradeDist) - sa(a.gradeDist);
    });
}

// 成績分布バー
function GradeBar({ dist, total }: { dist: GradeDist; total: number }) {
    const segments: { key: keyof GradeDist; color: string; label: string }[] = [
        { key: 'S', color: 'bg-emerald-500', label: 'S' },
        { key: 'A', color: 'bg-blue-500',    label: 'A' },
        { key: 'B', color: 'bg-yellow-400',  label: 'B' },
        { key: 'C', color: 'bg-orange-400',  label: 'C' },
        { key: 'F', color: 'bg-red-500',     label: 'F' },
    ];
    return (
        <div className="mt-1.5 space-y-1">
            <div className="flex h-2 w-full rounded-full overflow-hidden gap-px">
                {segments.map(({ key, color }) =>
                    dist[key] > 0 ? (
                        <div
                            key={key}
                            className={`${color} transition-all`}
                            style={{ width: `${dist[key] * 100}%` }}
                        />
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

export default function CourseSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CourseResult[]>([]);
    const [defaultResults, setDefaultResults] = useState<CourseResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [defaultLoading, setDefaultLoading] = useState(true);
    const [sortKey, setSortKey] = useState<SortKey>('year_desc');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // マウント時にデフォルト科目を取得（成績データがある科目を件数順）
    useEffect(() => {
        fetch('/api/courses')
            .then(r => r.json())
            .then((data: CourseResult[]) => setDefaultResults(data))
            .catch(() => {})
            .finally(() => setDefaultLoading(false));
    }, []);

    useEffect(() => {
        const trimmed = query.trim();

        if (!trimmed) {
            setResults([]);
            setSearched(false);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/courses?q=${encodeURIComponent(trimmed)}`);
                const data: CourseResult[] = await res.json();
                setResults(data);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
                setSearched(true);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const isSearchMode = query.trim().length > 0;
    const sorted = sortResults(results, sortKey);

    return (
        <div className="space-y-4">
            {/* 検索バー */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="科目名 or 時間割コードで検索…"
                    className="w-full h-11 rounded-md border border-input bg-background pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
            </div>

            {/* デフォルト: 成績データがある科目を件数順に表示 */}
            {!isSearchMode && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            成績データがある科目
                        </CardTitle>
                        <CardDescription>報告件数が多い順</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {defaultLoading && <SkeletonRows />}
                        {!defaultLoading && defaultResults.length === 0 && (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                                まだデータがありません。成績をアップロードすると表示されます。
                            </div>
                        )}
                        {!defaultLoading && defaultResults.length > 0 && (
                            <div className="grid sm:grid-cols-2 gap-1">
                                {defaultResults.map(course => (
                                    <div key={course.id} className="rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors">
                                        <p className="text-sm font-medium truncate">{course.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {course.year && <span className="text-xs text-muted-foreground">{course.year}年度</span>}
                                            {course.teacher && <span className="text-xs text-muted-foreground">{course.teacher}</span>}
                                            {course.credits && <span className="text-xs text-muted-foreground">{course.credits}単位</span>}
                                            {course.code && <span className="text-xs text-muted-foreground font-mono">{course.code}</span>}
                                        </div>
                                        {course.gradeDist && course.totalCount ? (
                                            <GradeBar dist={course.gradeDist} total={course.totalCount} />
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 検索結果 */}
            {isSearchMode && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            検索結果
                        </CardTitle>
                        {!searching && searched && (
                            <CardDescription>「{query.trim()}」— {results.length}件</CardDescription>
                        )}
                    </CardHeader>

                    {/* ソート */}
                    {!searching && results.length > 0 && (
                        <div className="px-6 pb-2 flex gap-1">
                            {([
                                ['year_desc', '新しい順'],
                                ['year_asc',  '古い順'],
                                ['sa_rate',   'S+A率順'],
                            ] as [SortKey, string][]).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setSortKey(key)}
                                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                        sortKey === key
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background text-muted-foreground border-input hover:bg-muted'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    <CardContent>
                        {searching && <SkeletonRows />}

                        {!searching && searched && results.length === 0 && (
                            <div className="py-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
                                <AlertCircle className="h-7 w-7 opacity-40" />
                                <p className="text-sm font-medium">該当する科目が見つかりません</p>
                                <p className="text-xs">別のキーワードで試してみてください。</p>
                            </div>
                        )}

                        {!searching && sorted.length > 0 && (
                            <div className="grid sm:grid-cols-2 gap-1">
                                {sorted.map(course => (
                                    <div
                                        key={course.id}
                                        className="rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{course.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    {course.year && (
                                                        <span className="text-xs text-muted-foreground">{course.year}年度</span>
                                                    )}
                                                    {course.teacher && (
                                                        <span className="text-xs text-muted-foreground">{course.teacher}</span>
                                                    )}
                                                    {course.credits && (
                                                        <span className="text-xs text-muted-foreground">{course.credits}単位</span>
                                                    )}
                                                    {course.semester && (
                                                        <span className="text-xs text-muted-foreground">{course.semester}</span>
                                                    )}
                                                    {course.code && (
                                                        <span className="text-xs text-muted-foreground font-mono">{course.code}</span>
                                                    )}
                                                </div>
                                                {course.gradeDist && course.totalCount ? (
                                                    <GradeBar dist={course.gradeDist} total={course.totalCount} />
                                                ) : (
                                                    <p className="text-[10px] text-muted-foreground mt-1">成績データなし</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
