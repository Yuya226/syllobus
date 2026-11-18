"use client";
import { useState } from 'react';
import { KOAN_SCREEN_WARNING, UPLOAD_GUIDES } from '@/lib/upload-guide';
export default function UploadGuide({ mode }: { mode: 'image' | 'csv' }) {
    const [device, setDevice] = useState<'pc' | 'mobile'>('mobile');
    const deviceGuide = UPLOAD_GUIDES[mode][device];
    const guide = deviceGuide ?? UPLOAD_GUIDES[mode].pc;
    return <details id="upload-guide" className="rounded border p-3 text-sm" open>
        <summary className="cursor-pointer font-semibold">{mode === 'image' ? 'スクリーンショット' : 'CSV'}の取得ガイド</summary>
        <label className="my-3 block">利用端末 <select className="rounded border bg-background p-2" value={device} onChange={e => setDevice(e.target.value as 'pc' | 'mobile')}><option value="mobile">スマートフォン</option><option value="pc">PC</option></select></label>
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 font-medium text-amber-950">{KOAN_SCREEN_WARNING}</p>
        {device === 'mobile' && !deviceGuide && <p className="mb-3 text-muted-foreground">端末別のボタン配置は未確認です。以下の画面名と出力内容を確認してください。</p>}
        {guide ? <div className="space-y-3"><p>{guide.screenName}</p><ol className="list-decimal space-y-2 pl-5">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {guide.image && <img src={guide.image.src} alt={guide.image.alt} className="h-auto w-full rounded" />}
            {guide.video && <video controls preload="none" className="w-full rounded"><source src={guide.video.src} /><track kind="captions" src={guide.video.captions} srcLang="ja" label="日本語" default /></video>}
        </div> : <p className="leading-relaxed text-muted-foreground">この端末向けの取得手順は確認中です。サンプルデータでもお試しいただけます。</p>}
        <p className="mt-3 text-muted-foreground">{mode === 'image' ? '氏名・学籍番号を隠し、科目名・年度・評語が読めるPNG／JPEG／WebPを選んでください（1枚4MBまで、最大5枚）。' : '単位修得CSVはShift-JIS／UTF-8に対応（4MBまで）。端末内で読み取り、任意の保存操作まで成績を送信しません。'}解析後は評語・単位数を必ず確認してください。</p>
    </details>;
}
