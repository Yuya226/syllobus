"use client";

import Link from "next/link";
import AcquisitionVideo from './AcquisitionVideo';
import UploadGuide from "./UploadGuide";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import type { AnalysisResult, AggregateStats, Faculty, Grade } from "@/lib/types";
import { FACULTY_OPTIONS } from "@/lib/types";
import { enrichForReview } from "@/lib/enrich-for-review";
import { parseCreditCSV, type ImportInfo } from '@/lib/credit-csv';
import { parseKoanCSV } from "@/lib/csv";
import { mergeImageGrades } from '@/lib/merge-image-grades';

interface Props {
    stats: AggregateStats | null;
    participantCount: number | null;
    faculty: Faculty | '';
    onFacultyChange: (f: Faculty | '') => void;
    onGradesParsed: (grades: Grade[], warning?: string, info?: ImportInfo) => void;
}

export default function UploadPanel({ participantCount, faculty, onFacultyChange, onGradesParsed }: Props) {
    const [consent, setConsent] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadMode, setUploadMode] = useState<'image' | 'csv'>('csv');
    const errorRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (uploadError) errorRef.current?.focus(); }, [uploadError]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const csvFileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const files = Array.from(input.files ?? []);
        if (files.length === 0) return;
        if (!consent) return;
        setUploadError('');
        setIsUploading(true);
        setUploadProgress(0);
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => prev >= 90 ? prev : prev + 10);
        }, 300);
        try {
            if (files.length > 5 || files.some(f => f.size > 4 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(f.type))) throw new Error('PNG・JPEG・WebPを1枚4MB以下、最大5枚で選び直してください。');
            const results = await Promise.all(files.map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                const response = await fetch("/api/analyze", { method: "POST", body: formData });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || `Analysis failed: ${response.status}`);
                }
                const data: AnalysisResult = await response.json();
                if (!data.grades.length) throw new Error('成績を読み取れませんでした。「履修成績照会」で「画面に表示する」を押した一覧を選んでください。「単位修得状況照会」は対象外です。');
                return data.grades;
            }));
            onGradesParsed(mergeImageGrades(results), '画像の単位数・区分は未照合または推定を含みます。学期が確認できない場合は「不明」として扱います。画像間で読取結果が異なる行は残しているため、元の一覧と照合し、重複・評語・単位数を修正してください。正確な区分・単位数・学期を含む単位修得CSVを推奨します。');
            setUploadProgress(100);
        } catch (error) {
            console.error("Error analyzing file:", error);
            setUploadError(error instanceof Error ? error.message : "解析できませんでした。ファイルを選び直してください。");
        } finally {
            clearInterval(progressInterval);
            setIsUploading(false);
            input.value = '';
        }
    };

    const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        if (!consent) return;
        setUploadError('');
        setIsUploading(true);
        setUploadProgress(0);
        try {
            if (!file.name.toLowerCase().endsWith('.csv') || file.size > 4 * 1024 * 1024) throw new Error('4MB以下のCSVを選び直してください。');
            const buffer = await file.arrayBuffer();
            const creditImport = parseCreditCSV(buffer);
            if (creditImport) {
                onGradesParsed(creditImport.grades, creditImport.info.warnings.join(' '), creditImport.info);
                return;
            }
            const parsed = parseKoanCSV(buffer);
            if (parsed.length === 0) {
                setUploadError('成績データが見つかりませんでした。「単位修得状況照会」から出力した科目明細入りのCSVを選び直してください。従来の履修成績CSVも補助対応しています。');
                return;
            }
            setUploadProgress(50);
            if (parsed.length > 500) throw new Error('一度に読み取れる成績は500件までです。');
            const result = await enrichForReview(parsed);
            onGradesParsed(result.grades, result.warning);
            setUploadProgress(100);
        } catch (error) {
            console.error('Error processing CSV:', error);
            setUploadError(error instanceof Error ? error.message : 'CSVを処理できませんでした。選び直してください。');
        } finally {
            setIsUploading(false);
            input.value = '';
        }
    };

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
                <div className="rounded-md border bg-card p-5 shadow-sm">
                    <Button asChild variant="outline" className="mb-3"><a href="/dashboard?demo=1">サンプルデータで試す</a></Button>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Unlock Insights</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">成績データをアップロード</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        KOANの「単位修得状況照会」からCSVを取り込むだけ。
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        ['卒業要件', '必要な単位を確認'],
                        ['修得ペース', '学期ごとの単位を確認'],
                        ['成績分析', 'GPAと科目別の評価'],
                    ].map(([title, description]) => <div key={title} className="rounded-md border bg-card p-4 shadow-sm"><h3 className="font-semibold text-sm">{title}</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p></div>)}
                </div>
                <AcquisitionVideo />
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFileChange} />
            <input type="file" ref={csvFileInputRef} className="hidden" accept=".csv" onChange={handleCsvChange} />

            <div className="rounded-md border bg-card p-5 shadow-sm">
                <div className="mb-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Upload</p>
                    <h3 className="mt-1 text-lg font-bold">解析を開始</h3>
                </div>

                {isUploading ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground" role="status">{uploadMode === 'csv' && uploadProgress >= 50 ? 'CSV読取済み。科目情報を照合中（最大8秒）...' : '成績表を読み取り中...'}</span>
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
                            onClick={() => { if (uploadMode !== 'image') setConsent(false); setUploadMode('image'); }}
                            className={`flex-1 rounded px-2 py-2 text-sm font-semibold transition-colors ${uploadMode === 'image' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            スクリーンショット
                        </button>
                        <button
                            onClick={() => { if (uploadMode !== 'csv') setConsent(false); setUploadMode('csv'); }}
                            className={`flex-1 rounded px-2 py-2 text-sm font-semibold transition-colors ${uploadMode === 'csv' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            単位修得CSV（推奨）
                        </button>
                    </div>

                    <UploadGuide mode={uploadMode} />
                    <label className="flex items-start gap-2 text-sm leading-relaxed"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" /><span>{uploadMode === 'image' ? '画像全体をGoogle Cloud Visionへ送信して解析することに同意します。' : '単位修得CSVは端末内で解析、従来の履修成績CSVは科目照合のため本サービスへ送信することを確認しました。'}</span></label>
                    <p className="text-xs text-muted-foreground">結果はブラウザに保存。サーバー保存は任意です。<Link href="/about" className="ml-1 underline">データの取扱い</Link></p>
                    {uploadError && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded border border-red-300 p-3 text-sm text-red-700"><p>{uploadError}</p><a href="#upload-guide" onClick={() => { const guide = document.getElementById('upload-guide'); if (guide instanceof HTMLDetailsElement) guide.open = true; }} className="underline">取得ガイドを確認</a><p>下のボタンからファイルを選び直せます。</p></div>}
                    {uploadMode === 'image' ? (
                        <Button disabled={!consent} size="lg" className="w-full min-h-12 h-auto whitespace-normal text-base font-bold" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-5 w-5" />
                            成績をアップロード（複数枚対応）
                        </Button>
                    ) : (
                        <Button disabled={!consent} size="lg" className="w-full min-h-12 h-auto whitespace-normal text-base font-bold" onClick={() => csvFileInputRef.current?.click()}>
                            <Upload className="mr-2 h-5 w-5" />
                            CSVでアップロード
                        </Button>
                    )}
                </div>
            )}

            <p className="mt-4 rounded-md bg-secondary/60 px-3 py-2 text-center text-sm text-muted-foreground">
                {participantCount != null
                    ? <>従来形式の集計対象 <span className="font-bold text-foreground">{participantCount}</span> セッション</>
                    : <>比較データは準備中</>
                }
            </p>
            </div>
        </div>
    );
}
