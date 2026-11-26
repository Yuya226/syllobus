'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { UPLOAD_GUIDES } from '@/lib/upload-guide';

/** Schematic of confirmed controls, not a recording or a reproduction of personal KOAN data. */
export default function UploadWalkthrough({mode}: {mode:'csv'|'image'}) {
    const [{step,playing,finished},setPlayback]=useState({step:0,playing:false,finished:false});
    const guide=UPLOAD_GUIDES[mode];
    useEffect(()=>{
        if(!playing)return;
        const timer=setTimeout(()=>setPlayback(current=>current.step===2
            ? {...current,playing:false,finished:true}
            : {...current,step:current.step+1}),3400);
        return ()=>clearTimeout(timer);
    },[step,playing]);
    const image=mode==='image';
    const screen=image?'履修成績照会':'単位修得状況照会';
    const target=step===0?{x:193,y:113}:step===1?{x:211,y:153}:{x:215,y:162};
    const cursorStyle={'--cursor-x':target.x+'px','--cursor-y':target.y+'px',animationPlayState:playing?'running':'paused'} as CSSProperties;
    return <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">操作イメージ · PC版</span>
            <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
                onClick={()=>setPlayback(current=>current.finished?{step:0,playing:true,finished:false}:{...current,playing:!current.playing})}>
                {playing?<Pause className="h-3.5 w-3.5"/>:finished?<RotateCcw className="h-3.5 w-3.5"/>:<Play className="h-3.5 w-3.5"/>}
                {playing?'一時停止':finished?'もう一度':'操作を再生'}
            </button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-slate-50">
            <svg viewBox="0 0 320 205" className="block h-auto w-full" role="img" aria-label={guide.steps[step].action}>
                <rect width="320" height="205" fill="#f8fafc"/>
                <rect x="12" y="14" width="296" height="177" rx="10" fill="white" stroke="#cbd5e1"/>
                <path d="M12 46H308" stroke="#e2e8f0"/>
                <circle cx="26" cy="30" r="3" fill="#cbd5e1"/><circle cx="36" cy="30" r="3" fill="#cbd5e1"/><circle cx="46" cy="30" r="3" fill="#cbd5e1"/>
                <text x="160" y="35" textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">{step===2?'Syllobus':'KOAN'}</text>
                {step===0?<g>
                    <rect x="28" y="59" width="60" height="28" rx="5" fill="#eff6ff"/>
                    <text x="58" y="78" textAnchor="middle" fontSize="13" fill="#1e40af">成績</text>
                    <path d="M58 89V112H85" fill="none" stroke="#94a3b8" strokeWidth="1.5"/>
                    <rect x="91" y="96" width="196" height="38" rx="6" fill="#dbeafe" stroke="#3b82f6"/>
                    <text x="189" y="120" textAnchor="middle" fontSize="14" fontWeight="600" fill="#1e40af">{screen}</text>
                    <text x="160" y="163" textAnchor="middle" fontSize="11" fill="#64748b">{image?'画像は「履修成績照会」から':'CSVは「単位修得状況照会」から'}</text>
                </g>:step===1?<g>
                    <text x="28" y="72" fontSize="12" fontWeight="600" fill="#334155">{screen}</text>
                    <rect x="26" y="85" width="268" height="32" rx="5" fill="#eff6ff"/>
                    <circle cx="42" cy="101" r="7" fill="white" stroke="#2563eb"/><circle cx="42" cy="101" r="3.5" fill="#2563eb"/>
                    <text x="57" y="106" fontSize="13" fill="#1e40af">過去を含めた全成績</text>
                    <path d="M160 121V133" stroke="#94a3b8" strokeWidth="1.5"/>
                    <rect x="66" y="136" width="188" height="34" rx="6" fill="#2563eb"/>
                    <text x="160" y="158" textAnchor="middle" fontSize="14" fontWeight="600" fill="white">{image?'画面に表示する':'ファイルに出力する'}</text>
                </g>:image?<g>
                    <rect x="33" y="57" width="115" height="64" rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeDasharray="4 3"/>
                    <rect x="172" y="57" width="115" height="64" rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeDasharray="4 3"/>
                    {[72,87,102].map(y=><g key={y}><path d={`M43 ${y}H138M182 ${y}H277`} stroke="#cbd5e1" strokeWidth="3"/></g>)}
                    <text x="160" y="135" textAnchor="middle" fontSize="11" fill="#475569">全授業を分けて撮影・氏名などは隠す</text>
                    <rect x="29" y="145" width="262" height="32" rx="6" fill="#2563eb"/>
                    <text x="160" y="166" textAnchor="middle" fontSize="12" fontWeight="600" fill="white">成績をアップロード（複数枚対応）</text>
                </g>:<g>
                    <rect x="131" y="56" width="58" height="52" rx="5" fill="#eff6ff" stroke="#93c5fd"/>
                    <text x="160" y="87" textAnchor="middle" fontSize="16" fontWeight="700" fill="#2563eb">CSV</text>
                    <text x="160" y="131" textAnchor="middle" fontSize="11" fill="#475569">データの取扱いを確認して</text>
                    <rect x="61" y="145" width="198" height="32" rx="6" fill="#2563eb"/>
                    <text x="160" y="166" textAnchor="middle" fontSize="13" fontWeight="600" fill="white">CSVでアップロード</text>
                </g>}
                <g key={step} aria-hidden="true">
                    <circle cx={target.x} cy={target.y} r="15" fill="none" stroke="#60a5fa" strokeWidth="3" className="guide-click-ring" style={{animationPlayState:playing?'running':'paused'}}/>
                    <g className="guide-cursor" style={cursorStyle}>
                        <path d="M0 0L2 24L8 17L14 28L19 25L13 15L23 14Z" fill="#0f172a" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    </g>
                </g>
            </svg>
        </div>
        <div className="grid grid-cols-3 gap-1" aria-label="ガイドのステップ">
            {guide.steps.map((item,i)=><button key={item.title} type="button" aria-pressed={step===i} onClick={()=>setPlayback({step:i,playing:false,finished:false})}
                className={`min-h-11 rounded-md px-1 py-2 text-xs leading-relaxed focus-visible:outline-2 focus-visible:outline-primary ${step===i?'bg-primary/10 font-semibold text-primary':'text-muted-foreground hover:bg-muted'}`}>
                <span className="mr-1">{i+1}.</span>{item.title}
            </button>)}
        </div>
        <p className="min-h-10 text-xs leading-relaxed text-muted-foreground">{guide.steps[step].action}</p>
    </div>;
}
