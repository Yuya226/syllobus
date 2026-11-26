"use client";
import { UPLOAD_GUIDES } from '@/lib/upload-guide';

export default function UploadGuide({ mode }: { mode: 'image' | 'csv' }) {
    const guide = UPLOAD_GUIDES[mode];
    return <details id="upload-guide" className="rounded border p-3 text-sm">
        <summary className="cursor-pointer font-semibold">{mode === 'image' ? 'スクリーンショット' : 'CSV'}の取得ガイド</summary>
        <p className="mt-3 text-xs text-muted-foreground">PC版KOAN · 3ステップ</p>
        <ol className="my-4 space-y-4">
            {guide.steps.map((step, i) => <li key={step.title} className="flex gap-3">
                <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                <div className="min-w-0"><p className="font-semibold">{step.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.action}</p></div>
            </li>)}
        </ol>
        {mode === 'image' && <p className="mb-3 text-xs font-medium">氏名・学籍番号は隠してください。</p>}
        {guide.source && <a href={guide.source.href} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline underline-offset-2">{guide.source.label}</a>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {guide.image && <img src={guide.image.src} alt={guide.image.alt} className="mt-3 h-auto w-full rounded" />}
        {guide.video && <video controls preload="none" className="mt-3 w-full rounded"><source src={guide.video.src} /><track kind="captions" src={guide.video.captions} srcLang="ja" label="日本語" default /></video>}
        <details className="mt-3 border-t pt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">うまくいかないとき・対応形式</summary>
            <ul className="mt-3 list-disc space-y-2 pl-4">{guide.notes.map(note => <li key={note}>{note}</li>)}</ul>
        </details>
    </details>;
}
