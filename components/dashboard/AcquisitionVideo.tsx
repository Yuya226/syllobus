'use client';
import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { UPLOAD_GUIDES } from '@/lib/upload-guide';

const captions = ['成績 → 単位修得状況照会', '全成績 → ファイルに出力する', 'ファイル出力開始 → CSVを保存'];

export default function AcquisitionVideo({mode}: {mode:'csv'|'image'}) {
    const media = UPLOAD_GUIDES[mode].video!;
    const label = mode==='csv'?'CSV':'スクリーンショット';
    const cues = media.cues ?? captions.map((text,i)=>({text,at:[0,6,8.25][i]}));
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cycles = useRef(0);
    const intent = useRef(true);
    const visible = useRef(false);
    const [paused,setPaused] = useState(true);
    const [finished,setFinished] = useState(false);
    const [step,setStep] = useState(0);
    const [failed,setFailed] = useState(false);

    useEffect(()=>{
        const video=videoRef.current;
        const container=containerRef.current;
        if(!video || !container)return;
        const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
        if(reduced.matches)intent.current=false;
        const sync=()=>{
            if(visible.current && !document.hidden && intent.current && cycles.current<3) {
                void video.play().catch(()=>{ intent.current=false; setPaused(true); });
            } else video.pause();
        };
        const observer=new IntersectionObserver(([entry])=>{visible.current=entry.isIntersecting&&entry.intersectionRatio>=0.35;sync();},{threshold:0.35});
        const reduceMotion=()=>{if(reduced.matches){intent.current=false;video.pause();}};
        observer.observe(container);
        document.addEventListener('visibilitychange',sync);
        reduced.addEventListener('change',reduceMotion);
        return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',reduceMotion);video.pause();};
    },[]);

    const toggle=()=>{
        const video=videoRef.current;
        if(!video || failed)return;
        if(!video.paused){intent.current=false;video.pause();return;}
        if(cycles.current>=3){cycles.current=0;video.currentTime=0;setFinished(false);}
        intent.current=true;
        void video.play().catch(()=>{intent.current=false;setPaused(true);});
    };
    const ended=()=>{
        cycles.current++;
        const video=videoRef.current;
        if(!video)return;
        if(cycles.current>=3){intent.current=false;setFinished(true);setPaused(true);return;}
        video.currentTime=0;
        if(intent.current && visible.current && !document.hidden)void video.play().catch(()=>{intent.current=false;setPaused(true);});
    };

    return <div ref={containerRef} className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <h3 className="text-sm font-semibold">{label}の取り方</h3>
            <span className="text-xs text-muted-foreground">{failed?'動画を読み込めませんでした':finished?'タップでもう一度':paused?'タップで再生':'タップで停止'}</span>
        </div>
        <button type="button" onClick={toggle} disabled={failed} aria-label={paused?`${label}取得動画を再生`:`${label}取得動画を一時停止`}
            className="relative block w-full overflow-hidden bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary">
            <video ref={videoRef} muted playsInline preload="metadata" poster={media.poster} width={media.width ?? 1120} height={media.height ?? 400}
                className="pointer-events-none block h-auto w-full" aria-hidden="true" tabIndex={-1}
                onPlay={()=>setPaused(false)} onPause={()=>setPaused(true)} onEnded={ended}
                onTimeUpdate={e=>setStep(Math.max(0,cues.findLastIndex(cue=>e.currentTarget.currentTime>=cue.at)))}
                onError={()=>{intent.current=false;setFailed(true);setPaused(true);}}>
                <source src={media.src} type="video/mp4"/>
                <track kind="captions" src={media.captions} srcLang="ja" label="日本語"/>
            </video>
            {paused&&!failed&&<span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/5"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-md"><Play className="ml-0.5 h-5 w-5" fill="currentColor"/></span></span>}
        </button>
        <p className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">{failed?'取得ガイドから文字の手順をご確認ください。':<><span className="mr-2 font-semibold text-primary">{step+1}/{cues.length}</span>{cues[step].text}</>}</p>
    </div>;
}
