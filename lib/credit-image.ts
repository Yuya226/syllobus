import type { Grade } from './types';
import type { VisionAnnotation } from './vision';
import { normalizeGradeCSV } from './grades';

// Column edges measured from the supplied KOAN PC credit-status table.
// Anchoring on No. and acquisition year supports cropping and uniform scaling.
// Other layouts are rejected, never interpreted as this table by guesswork.
const edges = [-6, 66, 397, 728, 1308, 1493, 1568, 1770, 2026, 2275, 2380, 2485];
const noCenter = 27, yearCenter = 1898;
const labels = ['No.', '科目詳細区分', '科目小区分', '科目名', 'リーディング', '高度教養', '単位数', '修得年度', '修得学期', '評語', '合否'];
const clean = (s:string) => s.normalize('NFKC').replace(/\s/g,'');
type Word = {text:string;x:number;y:number;left:number;right:number;top:number;bottom:number};
function words(annotations:VisionAnnotation[]):Word[] {
    return annotations.slice(1).flatMap(a=>{
        const v=a.boundingPoly?.vertices;
        if(!a.description || !v || v.length!==4)return [];
        const xs=v.map(p=>p.x??0),ys=v.map(p=>p.y??0);
        const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
        return [{text:a.description,x:(left+right)/2,y:(top+bottom)/2,left,right,top,bottom}];
    });
}
export class CreditImageError extends Error { constructor(message:string,public readonly status=422){super(message);} }
function fail(message:string):never {throw new CreditImageError(message);}
const help='表の左端のNo.から右端の合否まで、行を切らずに撮影してください。難しい場合はCSVをご利用ください。';
export function parseCreditImages(batches:VisionAnnotation[][]):Grade[][] {
    // Require a visible header in at least one image, including when the file order differs.
    if(!batches.some(a=>/科目小区分/.test(clean(a[0]?.description??'')) && /修得学期/.test(clean(a[0]?.description??''))))
        fail('1枚は「科目詳細区分・科目小区分・単位数」などの列見出しを含めてください。');
    return batches.map(annotations=>{
        const ws=words(annotations);
        const years=ws.filter(w=>/^(19|20)\d{2}$/.test(clean(w.text)));
        if(!years.length)fail('修得年度を読み取れませんでした。'+help);
        // Choose the year column with most aligned occurrences (summary GPA is excluded below).
        const column=years.reduce((best,w)=>years.filter(v=>Math.abs(v.x-w.x)<w.right-w.left).length>years.filter(v=>Math.abs(v.x-best.x)<best.right-best.left).length?w:best);
        const yearWords=years.filter(w=>Math.abs(w.x-column.x)<(column.right-column.left)/2);
        const integers=ws.filter(w=>/^[1-9]\d{0,2}$/.test(clean(w.text)) && w.x<column.x);
        const candidates=integers.filter(w=>yearWords.some(y=>Math.abs(y.y-w.y)<Math.max(y.bottom-y.top,w.bottom-w.top)*0.65));
        if(!candidates.length)fail('表のNo.を読み取れませんでした。'+help);
        const leftmost=Math.min(...candidates.map(w=>w.x));
        const anchors=candidates.filter(w=>Math.abs(w.x-leftmost)<(column.right-column.left)*0.4).sort((a,b)=>a.y-b.y);
        const scale=(column.x-leftmost)/(yearCenter-noCenter);
        if(scale<=0)fail(help);
        const x=(value:number)=>leftmost+(value-noCenter)*scale;
        const inCell=(w:Word,i:number)=>w.x>=x(edges[i])&&w.x<x(edges[i+1]);
        const header=ws.filter(w=>w.y<anchors[0].y && w.y>anchors[0].y-140*scale);
        const headerText=clean(header.map(w=>w.text).join(''));
        if(headerText.includes('科目小区分')) {
            for(const i of [1,2,3,6,7,8,9,10]) {
                const text=clean(header.filter(w=>inCell(w,i)).sort((a,b)=>a.top-b.top||a.left-b.left).map(w=>w.text).join(''));
                if(!text.replace('单位数','単位数').includes(labels[i]))fail('この表の列配置を確認できませんでした。PC表示の単位修得状況照会、またはCSVをご利用ください。');
            }
        }
        const grades:Grade[]=[];
        for(let index=0;index<anchors.length;index++) {
            const anchor=anchors[index];
            if(index && Number(clean(anchor.text))!==Number(clean(anchors[index-1].text))+1)fail('途中の行を読み取れませんでした。'+help);
            const rowYear=yearWords.find(y=>Math.abs(y.y-anchor.y)<Math.max(y.bottom-y.top,anchor.bottom-anchor.top)*0.65);
            if(!rowYear)fail(help);
            // Row numbers are vertically centered in wrapped rows. Use adjacent row midpoints.
            const gapBefore=index?anchor.y-anchors[index-1].y:(anchors[1]?.y-anchor.y)||Math.max(anchor.bottom-anchor.top,rowYear.bottom-rowYear.top)*2;
            const gapAfter=index+1<anchors.length?anchors[index+1].y-anchor.y:gapBefore;
            const row=ws.filter(w=>w.y>anchor.y-gapBefore/2&&w.y<anchor.y+gapAfter/2);
            const cell=(i:number)=>clean(row.filter(w=>inCell(w,i)).sort((a,b)=>Math.abs(a.y-b.y)>Math.min(a.bottom-a.top,b.bottom-b.top)*0.5?a.y-b.y:a.x-b.x).map(w=>w.text).join(''));
            const credits=Number(cell(6)), year=Number(cell(7));
            const semester=cell(8),subject=cell(3),categoryDetail=cell(1),category=cell(2),result=cell(10);
            const grade=normalizeGradeCSV(cell(9));
            if(!subject||!categoryDetail||!category||!Number.isFinite(credits)||credits<=0||credits>30||year<1990||year>2100||!Number.isInteger(year)||!['合','否','不合'].includes(result)||!grade||!['春学期','夏学期','秋学期','冬学期','春〜夏学期','秋〜冬学期','前期','後期','前学期','後学期','通年'].includes(semester))
                fail(`No.${clean(anchor.text)}の項目を読み取れませんでした。${help}`);
            if((grade==='F')===(result==='合'))fail(`No.${clean(anchor.text)}の評語と合否が一致しません。鮮明な画像で再試行してください。`);
            grades.push({subject,category,categoryDetail,credits,year,semester,grade,passed:result==='合',teacher:'',categorySource:'university-image',sourceRow:Number(clean(anchor.text))});
        }
        // Do not silently lose rows whose No. was not recognized.
        if(yearWords.some(y=>y.y>=anchors[0].y-5*scale && !anchors.some(a=>Math.abs(a.y-y.y)<(y.bottom-y.top)*0.7)))fail('一部の行を読み取れませんでした。'+help);
        if(!grades.length)fail(help);
        return grades;
    });
}
