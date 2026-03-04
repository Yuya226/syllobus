"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Search, BookOpen, AlertCircle, GraduationCap } from "lucide-react";
import type { HardCourse } from "@/lib/types";
import type { CourseResult } from "@/app/api/courses/route";

interface Props {
    hardCourses: HardCourse[];
    statsLoading: boolean;
}

function FailBadge({ rate }: { rate: number }) {
    const pct = Math.round(rate * 100);
    if (pct >= 40) return <Badge variant="destructive" className="text-xs px-2 py-0 shrink-0">不可{pct}%</Badge>;
    if (pct >= 20) return <Badge variant="secondary" className="text-xs px-2 py-0 shrink-0 text-orange-700 bg-orange-100">不可{pct}%</Badge>;
    return <Badge variant="outline" className="text-xs px-2 py-0 shrink-0">不可{pct}%</Badge>;
}

function SkeletonRows({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3 px-2">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-3 w-4 bg-muted rounded" />
                    <div className="h-3 flex-1 bg-muted rounded" />
                    <div className="h-5 w-14 bg-muted rounded-full" />
                </div>
            ))}
        </div>
    );
}

export default function CourseSearch({ hardCourses, statsLoading }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CourseResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false); // 一度でも検索したか
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const trimmed = query.trim();

        if (!trimmed) {
            setResults([]);
            setSearched(false);
            return;
        }

        // デバウンス: 300ms 入力待ち
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

    return (
        <div className="space-y-4">
            {/* 検索バー */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="科目名で検索…（例：線形代数、解析学）"
                    className="w-full h-11 rounded-md border border-input bg-background pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
            </div>

            {/* 検索モード */}
            {isSearchMode && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            検索結果
                        </CardTitle>
                        {!searching && searched && (
                            <CardDescription>
                                「{query.trim()}」— {results.length}件
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        {/* 検索中 */}
                        {searching && <SkeletonRows />}

                        {/* 結果なし */}
                        {!searching && searched && results.length === 0 && (
                            <div className="py-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
                                <AlertCircle className="h-7 w-7 opacity-40" />
                                <p className="text-sm font-medium">該当する科目が見つかりません</p>
                                <p className="text-xs">別のキーワードで試してみてください。</p>
                            </div>
                        )}

                        {/* 結果一覧 */}
                        {!searching && results.length > 0 && (
                            <div className="space-y-1">
                                {results.map(course => (
                                    <div
                                        key={course.id}
                                        className="rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-medium truncate">{course.name}</span>
                                                    {course.failRate !== null && (
                                                        <FailBadge rate={course.failRate} />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    {course.category && (
                                                        <span className="text-xs text-muted-foreground">{course.category}</span>
                                                    )}
                                                    {course.credits && (
                                                        <span className="text-xs text-muted-foreground">{course.credits}単位</span>
                                                    )}
                                                    {course.semester && (
                                                        <span className="text-xs text-muted-foreground">{course.semester}</span>
                                                    )}
                                                    {course.totalCount && (
                                                        <span className="text-xs text-muted-foreground">{course.totalCount}件の報告</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* デフォルトモード: エグ単速報 */}
            {!isSearchMode && (
                <Card className="border-orange-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Flame className="h-4 w-4 text-orange-500" />
                            エグ単速報
                        </CardTitle>
                        <CardDescription>
                            不可率が高い科目ランキング
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* ローディング */}
                        {statsLoading && <SkeletonRows />}

                        {/* データなし */}
                        {!statsLoading && hardCourses.length === 0 && (
                            <div className="py-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
                                <BookOpen className="h-8 w-8 opacity-40" />
                                <p className="text-sm font-medium">まだデータがありません</p>
                                <p className="text-xs leading-relaxed">
                                    「マイ成績・解析」タブで成績をアップロードすると、<br />
                                    科目の不可率データが集まっていきます。
                                </p>
                            </div>
                        )}

                        {/* ランキング */}
                        {!statsLoading && hardCourses.length > 0 && (
                            <div className="space-y-1">
                                {hardCourses.map((course, i) => (
                                    <div
                                        key={course.subject_name}
                                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors"
                                    >
                                        <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{i + 1}.</span>
                                        <span className="text-sm flex-1 truncate">{course.subject_name}</span>
                                        <span className="text-xs text-muted-foreground shrink-0">{course.totalCount}件</span>
                                        <FailBadge rate={course.failRate} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 検索ヒント（デフォルト時のみ） */}
            {!isSearchMode && !statsLoading && (
                <p className="text-xs text-center text-muted-foreground">
                    科目名で検索して、不可率をチェックしよう
                </p>
            )}
        </div>
    );
}
