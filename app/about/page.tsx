import Link from "next/link";
import { TrendingUp, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-6 shadow-sm gap-4">
                <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary hover:opacity-80 transition-opacity">
                    <TrendingUp className="h-5 w-5" />
                    Syllobus
                </Link>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
                <h1 className="text-2xl font-black">運営について</h1>

                {/* サービス説明 */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">サービスの目的</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                        <p>
                            Syllobus は、阪大生の成績に関する情報格差を解消することを目的とした、
                            阪大経済学部3回生による個人開発の非公式サービスです。
                        </p>
                        <p>
                            KOANの成績スクリーンショットまたはCSVをアップロードすることで、
                            学部別GPA実態・科目の成績分布などの集計データにアクセスできます。
                            サーバーへの成績保存は任意です。保存せずに分析や架空データのデモを体験できます。
                        </p>
                    </CardContent>
                </Card>

                {/* 免責事項 */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">免責事項</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                        <p>
                            本サービスは大阪大学の公式サービスではなく、大学とは一切関係ありません。
                        </p>
                        <p>
                            掲載している統計データはユーザーの投稿に基づくものであり、
                            その正確性・完全性を保証するものではありません。
                            履修選択の最終判断はご自身の責任でお願いします。
                        </p>
                        <p>
                            サービスの内容は予告なく変更・停止・終了する場合があります。
                        </p>
                    </CardContent>
                </Card>

                {/* プライバシーポリシー */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">プライバシーポリシー</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-3 leading-relaxed">
                        <div>
                            <p className="font-medium text-foreground mb-1">収集する情報</p>
                            <p>
                                解析時に科目名・科目コード・教員名・評語・単位数・年度・学期などを扱います。画像に氏名・学籍番号が写っていれば、それらも送信されるため、送信前に隠してください。セッションIDは氏名と紐付けませんが、成績の組合せによる識別の可能性があり、完全な匿名情報とは扱いません。
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-foreground mb-1">利用目的</p>
                            <p>
                                解析結果と選択した学部はブラウザのlocalStorageに保存します。サーバー保存に同意した場合のみ、セッションID・学部・科目名・科目コード・評語・単位数・年度・GPA・解析バージョンをSupabaseに保存し、成績復元と統計に利用します。端末を共有する場合は利用後にデータを削除してください。
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-foreground mb-1">外部サービスの利用</p>
                            <p>
                                スクリーンショットのOCR処理にGoogle Cloud Vision APIを使用しています。
                                画像全体をGoogle Cloud Visionに送信します。本アプリは元画像・元CSVをデータベースやファイルに保存しません。CSVは端末で解析し、抽出した成績をサーバーへ送信して科目情報を補完します。ホスティングにはVercel、データ保存にはSupabaseを使用します。リクエスト制限のためIPアドレスをUpstash Redisへ送信します。外部サービス側の処理・ログ・保持は各事業者の規定に従います。
                            </p>
                        </div>
                        <div><p className="font-medium text-foreground mb-1">保存期間と削除</p><p>アプリの成績保存に自動期限はありません。ダッシュボードの「サーバー・端末の成績を削除」で、同じブラウザの認証Cookieを用いて削除できます。「もう一度」は端末の表示データだけを消し、サーバーの成績は削除しません。Cookieや端末を失うと本人確認ができず、自動削除はできません。既存データの認証が失われた場合は運営へお問い合わせください。事業者のバックアップ・ログは即時削除を保証できません。</p></div>
                        <div><p className="font-medium text-foreground mb-1">公開範囲</p><p>個々の成績とセッションIDは公開しません。統計は10セッション未満を非公開とし、同一評語のみの科目分布も非公開とします。学部別平均と個別順位は公開停止中です。セッション数は実人数を保証せず、統計は任意投稿者の参考値です。デモの成績は架空で、メモリ上のみで処理し、保存・送信・統計算入しません。</p></div>
                    </CardContent>
                </Card>

                {/* お問い合わせ */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">お問い合わせ</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground leading-relaxed">
                        <p>
                            ご意見・ご要望・不具合報告は X (Twitter) のDMにてお気軽にどうぞ。
                        </p>
                        <a
                            href="https://twitter.com/shirobasu"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 font-medium text-primary hover:underline"
                        >
                            @shirobasu
                        </a>
                    </CardContent>
                </Card>
            </main>

            <footer className="border-t py-4">
                <p className="text-center text-xs text-muted-foreground">
                    阪大生による非公式サービス
                </p>
            </footer>
        </div>
    );
}
