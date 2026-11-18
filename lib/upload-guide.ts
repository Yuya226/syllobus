// Screen names and PC steps confirmed by the developer on 2026-11-18.
// The supplied screenshots contain personal information and are not public assets.
export interface GuideSection {
    screenName: string;
    steps: string[];
    image?: { src: string; alt: string };
    video?: { src: string; captions: string };
}

export const KOAN_SCREEN_WARNING = '「履修成績照会」を使ってください。「単位修得状況照会」の画面は解析対象外です。';
const commonSteps = [
    'KOANで「成績」を押します。「履修成績照会／範囲・出力先指示」が開きます。',
    '「過去を含めた全成績」を選択した状態にします（初期状態で選択されています）。',
];

export const UPLOAD_GUIDES: Record<'image' | 'csv', Record<'pc' | 'mobile', GuideSection | null>> = {
    image: {
        pc: {
            screenName: '履修成績照会 → スクリーンショット',
            steps: [
                ...commonSteps,
                '「画面に表示する」を押して、授業ごとの成績一覧を表示します。',
                '一覧をスクロールし、すべての授業が入るように複数枚に分けて撮影します。各授業の時間割コード・開講科目名・修得年度・評語が同じ画像内で読めるようにしてください。',
                '氏名・学籍番号などを隠し、保存した画像をSyllobusの「成績をアップロード」でまとめて選択します（最大5枚）。5枚に収まらない場合は、全成績を含むCSVをご利用ください。',
                '解析結果を元の成績一覧と照合し、授業の抜け・重複、評語・単位数を確認します。',
            ],
        },
        mobile: null,
    },
    csv: {
        pc: {
            screenName: '履修成績照会 → CSV出力',
            steps: [
                ...commonSteps,
                '「CSVに出力する」を押して、CSVファイルを保存します。',
                'Syllobusで「KOAN CSV」を選び、「CSVでアップロード」から保存したファイルを選択します。',
                '解析結果を確認し、すべての授業が含まれていることと、評語・単位数が正しいことを確認します。',
            ],
        },
        mobile: null,
    },
};
