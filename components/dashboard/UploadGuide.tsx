"use client";
import { useState } from 'react';
import UploadWalkthrough from './UploadWalkthrough';
import { UPLOAD_GUIDES } from '@/lib/upload-guide';

export default function UploadGuide({ mode }: { mode: 'image' | 'csv' }) {
    const [open,setOpen] = useState(false);
    const guide = UPLOAD_GUIDES[mode];
    return <details id="upload-guide" className="rounded border p-3 text-sm" onToggle={event=>setOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer font-semibold">{mode === 'image' ? 'スクリーンショット' : 'CSV'}の取得ガイド</summary>
        {open && !guide.video && <UploadWalkthrough key={mode} mode={mode}/>}
        {guide.video && <ol className="my-3 list-decimal space-y-2 pl-4 text-xs text-muted-foreground">{guide.steps.map(step=><li key={step.title}>{step.action}</li>)}</ol>}
        {mode === 'image' && <p className="mb-3 text-xs font-medium">氏名・学籍番号は隠してください。</p>}
        {guide.source && <a href={guide.source.href} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline underline-offset-2">{guide.source.label}</a>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {guide.image && <img src={guide.image.src} alt={guide.image.alt} className="mt-3 h-auto w-full rounded" />}
        <details className="mt-3 border-t pt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">うまくいかないとき・対応形式</summary>
            <ul className="mt-3 list-disc space-y-2 pl-4">{guide.notes.map(note => <li key={note}>{note}</li>)}</ul>
        </details>
    </details>;
}
