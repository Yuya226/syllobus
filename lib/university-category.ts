import type { Grade } from './types';
/** Map explicit university labels, never infer a missing category from a course name. */
export function universityCategory(g: Grade, economics = false): string | null {
    if (!['university-csv', 'university-image'].includes(g.categorySource ?? '')) return null;
    const sub = g.category?.normalize('NFKC').trim() ?? '';
    const detail = g.categoryDetail?.normalize('NFKC') ?? '';
    if (sub === '学問への扉') return 'gateway';
    if (sub === '情報教育科目') return 'info';
    if (sub.startsWith('健康・スポーツ教育科目')) return 'sports';
    if (sub.startsWith('基盤教養教育科目')) return economics ? (sub.includes('(必修)') ? 'lib_req' : 'lib_elec') : 'lib_base';
    if (sub.startsWith('第1外国語')) return 'english';
    if (sub.startsWith('第2外国語')) return sub.includes('上級') && economics ? 'jiyu_elec' : 'lang2';
    if (sub.startsWith('選択外国語')) return 'sel_lang';
    if (sub.startsWith('グローバル理解')) return 'global';
    if (sub === '高度教養教育科目') return 'adv_lib';
    if (sub === '高度国際性涵養教育科目') return 'adv_intl';
    if (sub.startsWith('アドヴァンスト')) return economics ? 'jiyu_elec' : 'adv_seminar';
    if (sub.startsWith('専門基礎教育科目')) return economics ? 'spec_basic' : 'spec_basic_celas';
    if (economics && detail.includes('専門教育科目')) {
        if (['専門セミナー(必修)', '研究セミナー(必修)', '必修科目'].includes(sub)) return 'spec_req';
        if (sub === '選択必修1') return 'sel1';
        if (sub === '選択必修2') return 'sel2';
        if (sub === '選択' || sub === '選択科目') return 'spec_elec';
        if (sub.includes('実践講義') || sub.includes('教職')) return 'jiyu_elec';
    }
    if (economics && sub === '自由選択科目') return 'jiyu_elec';
    return null;
}
