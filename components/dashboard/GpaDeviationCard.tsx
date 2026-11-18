"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";
import type { AnalysisResult, AggregateStats } from "@/lib/types";

function deviationComment(val: number): string {
    if (val >= 75) return "投稿データ内で平均を大きく上回っています。";
    if (val >= 65) return "平均を大きく上回る優秀な成績。しっかり努力が実っています。";
    if (val >= 55) return "平均よりやや上。安定した成績をキープしています。";
    if (val >= 45) return "全体の中間付近。履修戦略を見直すと一気に伸びるかも。";
    if (val >= 35) return "やや平均を下回る結果。エグ単を避けた戦略的な履修が効果的です。";
    return "まだまだ巻き返せます。エグ単情報を活用して次の学期を攻略しよう。";
}

function deviationColor(val: number): string {
    if (val >= 65) return "from-emerald-500 to-teal-600";
    if (val >= 55) return "from-blue-500 to-indigo-600";
    if (val >= 45) return "from-amber-500 to-orange-500";
    return "from-rose-500 to-red-600";
}

interface Props {
    analysisData: AnalysisResult;
    stats: AggregateStats | null;
    deviation: number | null;
    participantCount: number | null;
}

export default function GpaDeviationCard({ analysisData, stats, deviation, participantCount }: Props) {
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        const devText = deviation != null ? `偏差値 ${deviation}` : `GPA ${analysisData.gpa.cumulative}`;
        const percentileText = stats?.userPercentile ? `上位${stats.userPercentile}%` : '';
        const text = `投稿者内GPA${devText}！\nGPA ${analysisData.gpa.cumulative}${percentileText ? ` / ${percentileText}` : ''}\n\n#阪大成績偏差値 #シロバス\nhttps://syllobus.com`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    };

    const handleCopy = async () => {
        const devText = deviation != null ? `偏差値 ${deviation}` : `GPA ${analysisData.gpa.cumulative}`;
        const percentileText = stats?.userPercentile ? `上位${stats.userPercentile}%` : '';
        await navigator.clipboard.writeText(`投稿者内GPA${devText}！\nGPA ${analysisData.gpa.cumulative}${percentileText ? ` / ${percentileText}` : ''}\n#阪大成績偏差値 #シロバス`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="overflow-hidden border-0 shadow-md">
            <div className={`bg-gradient-to-br ${deviation != null ? deviationColor(deviation) : 'from-primary to-blue-600'} p-5 text-white`}>
                <p className="text-sm font-semibold opacity-85 mb-1">
                    投稿者内GPA偏差値｜{(stats?.totalParticipants ?? participantCount ?? 0) > 0 ? `${stats?.totalParticipants ?? participantCount}セッションの標本` : '比較データなし'}
                </p>
                {deviation != null ? (
                    <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-end">
                        <p className="text-7xl font-black tracking-tight leading-none">
                            {deviation}
                        </p>
                        <div>
                            <p className="text-sm opacity-90 leading-relaxed">
                                {deviationComment(deviation)}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-85">
                                <span className="rounded bg-white/15 px-2 py-1">全体平均 {stats!.averageGpa.toFixed(2)}</span>
                                <span className="rounded bg-white/15 px-2 py-1">あなた {analysisData.gpa.cumulative}</span>
                                {stats?.userPercentile != null && (
                                    <span className="rounded bg-white/20 px-2 py-1 font-bold text-white">上位{stats.userPercentile}%</span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-4">
                        <p className="text-5xl font-black opacity-40">--</p>
                        <p className="text-sm opacity-70 mt-2">10セッション未満は非公開です。比較データがない場合も表示されません。</p>
                    </div>
                )}
            </div>
            <p className="px-4 pt-3 text-xs text-muted-foreground">任意投稿者の参考値であり、阪大全体を代表する統計ではありません。</p>
            <CardContent className="flex flex-wrap gap-2 p-4">
                <Button onClick={handleShare} size="sm" className="gap-1.5 flex-1">
                    <Share2 className="h-3.5 w-3.5" />
                    X でシェア
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 flex-1">
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "コピーした！" : "コピー"}
                </Button>
            </CardContent>
        </Card>
    );
}
