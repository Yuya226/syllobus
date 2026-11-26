'use client';
import { departmentOptions } from '@/lib/departments';
import type { Faculty } from '@/lib/types';

export default function DepartmentSelect({faculty,value,onChange}: {faculty:Faculty|'';value:string;onChange:(value:string)=>void}) {
    const options=departmentOptions(faculty);
    return <label className="dashboard-field">学科・専攻
        <select value={value} disabled={!faculty} onChange={e=>onChange(e.target.value)}>
            <option value="">{faculty?'選択してください':'先に学部を選択'}</option>
            {value&&!options.includes(value)&&<option value={value}>要再選択：{value}</option>}
            {options.map(d=><option key={d}>{d}</option>)}
        </select>
    </label>;
}
