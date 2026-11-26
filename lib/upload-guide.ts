// PC screen names confirmed by the developer and the official KOAN manual.
// Raw screenshots/recordings are private. The CSV video is a cropped, silent edit of the developer recording supplied 2026-11-27.
export interface GuideSection {
    steps: { title: string; action: string }[];
    notes: string[];
    image?: { src: string; alt: string };
    video?: { src: string; captions: string; poster?: string };
    source?: { href: string; label: string };
}

export const UPLOAD_GUIDES: Record<'image' | 'csv', GuideSection> = {
    csv: {
        video: { src: '/guides/koan-credit-csv.mp4', captions: '/guides/koan-credit-csv.ja.vtt', poster: '/guides/koan-credit-csv-poster.jpg' },
        steps: [
            { title: 'KOANを開く', action: '成績 → 単位修得状況照会' },
            { title: 'CSVを保存', action: '過去を含めた全成績 → ファイルに出力する' },
            { title: 'ここに取り込む', action: 'CSVでアップロード → 成績を確認' },
        ],
        notes: [
            'スマートフォンで項目が見つからない場合は、PCで保存したCSVを端末へ移してください。',
            '確認画面の「ファイル出力開始」を1回押し、CSVを保存してください。',
            '科目区分・単位数・修得年度・学期を含む元のCSVを使用します。集計表だけのファイルは使えません。',
            'Shift-JIS／UTF-8、4MBまで。取り込み後は科目数・評語・単位数・学期を確認してください。',
            '従来の履修成績CSVも対応していますが、科目情報の補完には通信が必要です。',
        ],
        source: { href: 'https://www.celas.osaka-u.ac.jp/wp-content/uploads/fresher/2026/registration-manual.pdf#page=11', label: '公式マニュアルの画面例 ↗' },
    },
    image: {
        steps: [
            { title: 'KOANを開く', action: '成績 → 履修成績照会' },
            { title: '全成績を表示', action: '過去を含めた全成績 → 画面に表示する' },
            { title: '撮影して取り込む', action: '全授業を分けて撮影 → 画像をまとめて選択' },
        ],
        notes: [
            'スマートフォン専用画面の配置は未確認です。',
            '各授業の時間割コード・科目名・修得年度・評語が、同じ画像内で読めるように撮影してください。',
            'PNG／JPEG／WebP、1枚4MB・最大5枚。収まらない場合はCSVをご利用ください。',
            '解析後は授業の抜け・重複、評語・単位数を確認してください。',
        ],
    },
};
