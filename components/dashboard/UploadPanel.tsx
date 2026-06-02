"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, TrendingUp, Users, Flame, Lock } from "lucide-react";
import type { AnalysisResult, AggregateStats, Faculty, Grade } from "@/lib/types";
import { FACULTY_OPTIONS } from "@/lib/types";
import { parseKoanCSV } from "@/lib/csv";

function mergeGrades(allGrades: Grade[][]): Grade[] {
    const map = new Map<string, Grade>();
    for (const grades of allGrades) {
        for (const grade of grades) {
            const key = grade.courseCode
                ? `${grade.courseCode}-${grade.year}`
                : `${grade.subject}-${grade.year}`;
            const existing = map.get(key);
            if (!existing) {
                map.set(key, grade);
            } else if (existing.grade === 'P' && grade.grade !== 'P') {
                map.set(key, grade);
            }
        }
    }
    return Array.from(map.values());
}

const placeholderFaculties = [['工学部', 2.71], ['理学部', 2.85], ['経済学部', 2.62]] as [string, number][];
const placeholderCourses = ['線形代数学', '解析学入門', '有機化学'];

interface Props {
    stats: AggregateStats | null;
    participantCount: number | null;
    faculty: Faculty | '';
    onFacultyChange: (f: Faculty | '') => void;
    onGradesParsed: (grades: Grade[]) => void;
}

export default function UploadPanel({ participantCount, faculty, onFacultyChange, onGradesParsed }: Props) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadMode, setUploadMode] = useState<'image' | 'csv'>('image');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const csvFileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        setIsUploading(true);
        setUploadProgress(0);
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => prev >= 90 ? prev : prev + 10);
        }, 300);
        try {
            const results = await Promise.all(files.map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                const response = await fetch("/api/analyze", { method: "POST", body: formData });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || `Analysis failed: ${response.status}`);
                }
                const data: AnalysisResult = await response.json();
                return data.grades;
            }));
            onGradesParsed(mergeGrades(results));
            setUploadProgress(100);
        } catch (error) {
            console.error("Error analyzing file:", error);
            alert(`Error: ${error instanceof Error ? error.message : "An unknown error occurred"}`);
        } finally {
            clearInterval(progressInterval);
            setIsUploading(false);
        }
    };

    const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const buffer = await file.arrayBuffer();
            const parsed = parseKoanCSV(buffer);
            if (parsed.length === 0) {
                alert('成績データが見つかりませんでした。KOANからエクスポートしたCSVか確認してください。');
                return;
            }
            setUploadProgress(50);
            const response = await fetch('/api/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grades: parsed }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Enrich failed: ${response.status}`);
            }
            const data: AnalysisResult = await response.json();
            onGradesParsed(data.grades);
            setUploadProgress(100);
        } catch (error) {
            console.error('Error processing CSV:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
                <div className="rounded-md border bg-card p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Unlock Insights</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">成績データをアップロード</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        KOANのスクリーンショットまたはCSVを解析し、GPA偏差値・成績分布・卒業要件チェックを表示します。
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                {/* GPA偏差値 preview */}
                <div className="relative rounded-md border bg-card overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">GPA偏差値</span>
                        {participantCount != null && (
                            <Badge variant="secondary" className="ml-auto text-xs">{participantCount}人の母数</Badge>
                        )}
                    </div>
                    <div className="px-4 py-6 flex flex-col items-center gap-1 select-none">
                        <p className="text-xs text-muted-foreground">あなたの偏差値</p>
                        <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 blur-sm">
                            62.4
                        </p>
                        <p className="text-xs text-muted-foreground blur-sm">平均よりやや上。安定した成績をキープ...</p>
                    </div>
                    <div className="absolute inset-0 bg-background/65 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
                            <Lock className="h-4 w-4" />
                            アップすると解除
                        </div>
                    </div>
                </div>

                {/* Faculty GPA preview */}
                <div className="relative rounded-md border bg-card overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold">学科別GPA実態</span>
                        <Badge variant="secondary" className="ml-auto text-xs">集計中</Badge>
                    </div>
                    <div className="px-4 py-3 space-y-2 select-none">
                        {placeholderFaculties.map(([fac, gpa]) => (
                            <div key={fac} className="flex items-center gap-3 opacity-40">
                                <span className="text-xs text-muted-foreground w-20 truncate">{fac}</span>
                                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min((gpa / 4) * 100, 100)}%` }} />
                                </div>
                                <span className="text-xs font-bold text-blue-600 w-8 text-right blur-sm">{gpa.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-background/65 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
                            <Lock className="h-4 w-4" />
                            アップすると解除
                        </div>
                    </div>
                </div>

                {/* 楽単速報 preview */}
                <div className="relative rounded-md border bg-card overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-semibold">楽単速報</span>
                        <Badge variant="outline" className="ml-auto text-xs border-orange-200 text-orange-600">不可率TOP</Badge>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 select-none">
                        {placeholderCourses.map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                                <span className="text-xs flex-1 blur-sm">{s}</span>
                                <Badge variant="destructive" className="text-xs px-1.5 py-0 opacity-30">不可XX%</Badge>
                            </div>
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-background/65 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
                            <Lock className="h-4 w-4" />
                            アップすると解除
                        </div>
                    </div>
                </div>
            </div>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            <input type="file" ref={csvFileInputRef} className="hidden" accept=".csv" onChange={handleCsvChange} />

            <div className="rounded-md border bg-card p-5 shadow-sm">
                <div className="mb-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Upload</p>
                    <h3 className="mt-1 text-lg font-bold">解析を開始</h3>
                </div>

                {isUploading ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">成績表を解析中...</span>
                            <span className="font-medium">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                    </div>
                ) : (
                <div className="space-y-3">
                    <select
                        value={faculty}
                        onChange={(e) => onFacultyChange(e.target.value as Faculty | '')}
                        className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value="">学部を選択（任意）▼</option>
                        {FACULTY_OPTIONS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>

                    <div className="flex rounded-md border bg-secondary/50 p-1">
                        <button
                            onClick={() => setUploadMode('image')}
                            className={`flex-1 rounded px-2 py-2 text-sm font-semibold transition-colors ${uploadMode === 'image' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            スクリーンショット
                        </button>
                        <button
                            onClick={() => setUploadMode('csv')}
                            className={`flex-1 rounded px-2 py-2 text-sm font-semibold transition-colors ${uploadMode === 'csv' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            KOAN CSV
                        </button>
                    </div>

                    {uploadMode === 'image' ? (
                        <Button size="lg" className="w-full h-12 text-base font-bold" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-5 w-5" />
                            成績をアップロード（複数枚対応）
                        </Button>
                    ) : (
                        <Button size="lg" className="w-full h-12 text-base font-bold" onClick={() => csvFileInputRef.current?.click()}>
                            <Upload className="mr-2 h-5 w-5" />
                            CSVでアップロード
                        </Button>
                    )}
                </div>
            )}

            <p className="mt-4 rounded-md bg-secondary/60 px-3 py-2 text-center text-sm text-muted-foreground">
                {participantCount != null
                    ? <>すでに <span className="font-bold text-foreground">{participantCount}</span> 人が参加</>
                    : <>データ取得中...</>
                }
            </p>
            </div>
        </div>
    );
}
