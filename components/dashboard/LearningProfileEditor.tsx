'use client';
import type { Grade } from '@/lib/types';
import { TERMS, type LearningProfile } from '@/lib/learning-profile';
export default function LearningProfileEditor({grades,value,onChange,identity=true}: {identity?:boolean;grades:Grade[];value:LearningProfile;onChange:(p:LearningProfile)=>void}) {
    const years=[...new Set(grades.map(g=>g.year))].sort();
    return <div className="space-y-5 text-sm">
        <h3 className="font-semibold">比較条件</h3>
        <p>学籍番号から学部・学年を推定しません。学年が不明な年度は空欄のままにしてください。休学・留年等があれば実際の学年を入力してください。</p>
        {identity && <div className="flex flex-wrap gap-3">
            <label>学科・専攻 <input className="block rounded border p-2 max-w-full" maxLength={100} value={value.department} onChange={e=>onChange({...value,department:e.target.value})}/></label>
            <label>入学年度 <input className="block rounded border p-2 w-28" type="number" min={1990} max={2100} value={value.admissionYear??''} onChange={e=>onChange({...value,admissionYear:e.target.value?Number(e.target.value):null})}/></label>
        </div>}
        <div className="flex flex-wrap gap-3">{years.map(y=><label key={y}>{y}年度の学年 <select className="block rounded border p-2" value={value.yearLevels[y]??''} onChange={e=>{const yearLevels={...value.yearLevels}; if(e.target.value) yearLevels[y]=Number(e.target.value); else delete yearLevels[y]; onChange({...value,yearLevels,complete:false});}}><option value="">未入力</option>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}年次</option>)}</select></label>)}</div>
        <p>比較する時点（成績発表済みの学期末）</p>
        <div className="flex flex-wrap gap-2"><label>年度 <select className="rounded border p-2" value={value.completedYear??''} onChange={e=>onChange({...value,completedYear:e.target.value?Number(e.target.value):null,complete:false})}><option value="">未選択</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
        <label>学期 <select className="rounded border p-2" value={value.completedTerm} onChange={e=>onChange({...value,completedTerm:e.target.value,complete:false})}><option value="">未選択</option>{TERMS.map(t=><option key={t}>{t}</option>)}</select></label></div>
        <label className="flex gap-2"><input type="checkbox" checked={value.complete} disabled={!value.completedYear||!value.completedTerm||!value.yearLevels[value.completedYear]} onChange={e=>onChange({...value,complete:e.target.checked})}/>選択した時点までの全修得単位を含み、学年も確認しました（単位ペース・履修傾向の集計対象にする）。</label>
        <p className="text-muted-foreground">入力だけでは送信しません。共有保存に同意した場合のみ、この条件も成績とともに保存します。</p>
    </div>;
}
