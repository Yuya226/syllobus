"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, FileText, Users, LineChart as LineChartIcon } from "lucide-react";
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
    LineChart, Line, ReferenceLine,
} from "recharts";
import type { AnalysisResult, AggregateStats, Faculty } from "@/lib/types";
import GraduationCheck from "@/components/dashboard/GraduationCheck";

const GRADE_DIST_CONFIG = [
    { grade: "S", color: "#22c55e" },
    { grade: "A", color: "#3b82f6" },
    { grade: "B", color: "#eab308" },
    { grade: "C", color: "#f97316" },
    { grade: "F", color: "#ef4444" },
];

function semesterOrder(sem: string): number {
    if (sem.includes('春') || sem.includes('前期')) return 0;
    if (sem.includes('夏')) return 1;
    if (sem.includes('秋') || sem.includes('後期')) return 2;
    if (sem.includes('冬')) return 3;
    if (sem.includes('通年')) return 4;
    return 5;
}

/** "2024 前期" 形式のキーを年度→学期順にソートして推移データにする */
function buildGpaTrend(semesters: Record<string, number>): { label: string; gpa: number }[] {
    return Object.entries(semesters)
        .map(([key, gpa]) => {
            const spaceIdx = key.indexOf(' ');
            const year = parseInt(key.slice(0, spaceIdx)) || 0;
            const sem = key.slice(spaceIdx + 1);
            return { label: key, year, sem, gpa };
        })
        .filter(e => e.sem !== '不明')
        .sort((a, b) => a.year - b.year || semesterOrder(a.sem) - semesterOrder(b.sem))
        .map(({ label, gpa }) => ({ label, gpa }));
}

interface Props {
    analysisData: AnalysisResult;
    stats: AggregateStats | null;
    faculty: Faculty | '';
}

export default function StatsPanel({ analysisData, stats, faculty }: Props) {
    const gradeCounts = analysisData.grades.reduce((acc, curr) => {
        if (curr.grade) acc[curr.grade] = (acc[curr.grade] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const gradeDist = GRADE_DIST_CONFIG.map(({ grade, color }) => ({
        grade,
        color,
        count: gradeCounts[grade] || 0,
    }));

    const facultyGpas = stats?.facultyGpaBreakdown
        ? Object.entries(stats.facultyGpaBreakdown).sort((a, b) => b[1] - a[1])
        : [];

    const gpaTrend = buildGpaTrend(analysisData.gpa.semesters);
    const totalRequired = analysisData.graduationRequirement.total;

    return (
        <div className="space-y-5">
            {/* 上段: 学科別GPA + 個人成績 */}
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
                {facultyGpas.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                学科別GPA実態
                            </CardTitle>
                            <CardDescription>全体平均 <span className="font-bold text-foreground">{stats!.averageGpa.toFixed(2)}</span></CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {facultyGpas.map(([fac, gpa]) => {
                                const isMine = fac === faculty;
                                return (
                                    <div key={fac} className={`flex items-center gap-3 ${isMine ? 'rounded-md bg-blue-50 dark:bg-blue-950/30 -mx-2 px-2 py-1' : ''}`}>
                                        <span className={`text-xs w-24 truncate shrink-0 ${isMine ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>
                                            {fac}{isMine && ' ★'}
                                        </span>
                                        <div className="relative flex-1 h-1.5 bg-secondary rounded-full overflow-visible">
                                            <div className={`h-full rounded-full transition-all ${isMine ? 'bg-blue-600' : 'bg-blue-400'}`} style={{ width: `${Math.min((gpa / 4) * 100, 100)}%` }} />
                                            {isMine && (
                                                <div
                                                    className="absolute -top-1 h-3.5 w-0.5 bg-foreground rounded-full"
                                                    style={{ left: `${Math.min((analysisData.gpa.cumulative / 4) * 100, 100)}%` }}
                                                    title={`あなたのGPA ${analysisData.gpa.cumulative}`}
                                                />
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-blue-600 w-8 text-right shrink-0">{gpa}</span>
                                    </div>
                                );
                            })}
                            {faculty && facultyGpas.some(([fac]) => fac === faculty) && (
                                <p className="text-[10px] text-muted-foreground pt-1">
                                    ★ = あなたの学部 ｜ 縦線 = あなたのGPA（{analysisData.gpa.cumulative}）
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4 grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">通算GPA</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analysisData.gpa.cumulative}</div>
                            <p className="text-xs text-muted-foreground">解析データより</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">修得単位数</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {analysisData.earnedCredits}
                                {totalRequired > 0 && <span className="text-base font-semibold text-muted-foreground"> / {totalRequired}</span>}
                            </div>
                            {totalRequired > 0 ? (
                                <div className="mt-2 h-1 w-full bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${analysisData.graduationRequirement.percentage}%` }} />
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground mt-1">総必要単位数は学部要件を確認</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 下段: 評価分布 + GPA推移 */}
            <div className={`grid gap-5 ${gpaTrend.length >= 2 ? 'lg:grid-cols-2' : ''}`}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">評価分布</CardTitle>
                        <CardDescription>S / A / B / C / F の取得数</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={gradeDist}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="grade" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {gradeDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {gpaTrend.length >= 2 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <LineChartIcon className="h-4 w-4 text-primary" />
                                学期別GPA推移
                            </CardTitle>
                            <CardDescription>
                                通算 <span className="font-bold text-foreground">{analysisData.gpa.cumulative}</span>
                                {stats && stats.averageGpa > 0 && <>・全体平均 {stats.averageGpa.toFixed(2)}</>}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={gpaTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip formatter={(v) => [v, 'GPA']} />
                                    {stats && stats.averageGpa > 0 && (
                                        <ReferenceLine
                                            y={stats.averageGpa}
                                            stroke="#94a3b8"
                                            strokeDasharray="4 4"
                                            label={{ value: `全体平均 ${stats.averageGpa.toFixed(2)}`, position: 'insideTopRight', fontSize: 10, fill: '#64748b' }}
                                        />
                                    )}
                                    <Line type="monotone" dataKey="gpa" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* 下段: 卒業要件（全幅） */}
            <GraduationCheck grades={analysisData.grades} faculty={faculty} />
        </div>
    );
}
