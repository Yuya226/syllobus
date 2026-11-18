// Screen names and PC steps confirmed by the developer on 2026-11-18.
// The supplied screenshots contain personal information and are not public assets.
export interface GuideSection {
    screenName: string;
    steps: string[];
    image?: { src: string; alt: string };
    video?: { src: string; captions: string };
}

export const KOAN_SCREEN_WARNING = '推奨：単位修得状況照会のCSV。大学の科目区分・単位数・修得学期をそのまま利用できます。スクリーンショットは従来の履修成績照会のみ補助対応しています。';
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
            screenName: '単位修得状況照会 → CSV（推奨）',
            steps: [
                'KOANの成績メニューから「単位修得状況照会」を開き、CSVを出力します。出力ボタンの位置・名称は未確認のため、画面内の案内を確認してください。',
                '科目詳細区分・科目小区分・開講科目名・単位数・修得年度・修得学期・評語・合否を含む元のCSVを選びます。集計表だけのファイルは使えません。',
                'Syllobusの「CSVでアップロード」で選択し、科目数・単位数・学期を確認します。学籍番号などは取り込みません。',
                '従来の履修成績照会CSVも読み取れますが、分類・単位数の補完には通信が必要です。卒業要件確認には単位修得CSVをおすすめします。',
            ],
        },
        mobile: null,
    },
};
