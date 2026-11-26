# Cloudflare移行（2026-11-19）

> **運用方針確定：旧Supabaseを復旧・移行せず、新しいCloudflare Workers + D1だけで運用する。** 過去の利用者はCSV再取り込み・任意の共有保存で再開する。以下の旧データ復旧手順は履歴であり、現在の残タスクではない。新D1のデータは維持する。

> 2026-11-26更新：通常の名前解決でsyllobus.comの保存・復元・削除・他セッション拒否の検証が成功。DNS反映待ちは解消。依存監査も全依存0件へ更新済み。以下は移行時の経緯を含むため、現在の残作業は[公開受入チェック](release-acceptance.md)を参照。

復元中のSupabaseを変更・削除せず、新しいCloudflare Workers + D1に新規保存先を用意する。Next.js / Reactの画面と既存APIの認証・同意・少人数抑制を維持。OpenNextでWorkersへビルドする。Google Cloud VisionはSDKの動的コード生成を避け、署名JWTによるOAuth認証とREST APIを使用し、レート制限はD1に移行。IPのHMACと固定時間帯によるカウンターを原子的に更新し、1時間10回を上限とする。

## データ

- D1は新規DB。Supabaseの既存成績・シラバスは未移行。古い統計を架空値で埋めない。
- Workersは`DATABASE_PROVIDER=d1`でD1 bindingを利用し、Supabaseへのランタイム接続はしない。既存Vercel環境はロールバック用に従来接続を維持。
- DBの公開RESTエンドポイントは設けず、認証済みAPIからのみ個人成績を取得・更新・削除する。
- 新旧成績の置換と削除はD1 batch transaction。同じセッションの二重集計を避ける。
- Supabase復旧後、まず安全なバックアップとスキーマ・件数を確認してから別途移行。D1側に再保存されたセッションの成績を古いデータで上書きしない。
- workers.devとsyllobus.comはブラウザ保存領域/Cookieが別。独自ドメイン切替前に試す場合、CSV再取込が必要。秘密情報をURLに入れて引き継がない。

## 操作

```sh
npm ci
npm run cf:typegen
npm test
npm run test:d1
npm run lint
npm run build:cloudflare
npx wrangler deploy --dry-run
npx wrangler d1 migrations apply syllobus --remote
npm run deploy:cloudflare
```

Secretsは`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_PROJECT_ID`, `WRITE_TOKEN_SECRET`。秘密値をコミットしない。既存Cookieを保持するためWRITE_TOKEN_SECRETは変更しない。`.dev.vars`はローカル専用でgitignore済み。

`npm run test:d1`は隔離したローカルDBを使用し、保存・復元・他セッションの分離・SQLパラメーター・制約違反時のロールバック・新旧置換・削除を実行する。`node scripts/smoke-cloudflare.mjs https://<worker>.workers.dev`は専用の架空1件を保存し、finallyで削除を確認する。実ユーザーのCSVは送信しない。

## 独自ドメイン

syllobus.comのCloudflare zoneはactive。お名前.comのNS変更済みで、割当NSは `corey.ns.cloudflare.com` / `deb.ns.cloudflare.com`。公開DNSはCloudflareのプロキシIPを返し、`syllobus.com/*` Workers Routeを設定済み。TLSのホスト名検証を保ち、権威DNSで確認したCloudflare IPを指定して独自ドメインの保存・復元・削除・他セッション拒否を確認した。

ローカルDNSキャッシュは一部旧Vercelを返し、通常名前解決での保存は503になる場合がある。反映中に再確認する際は、`scripts/smoke-cloudflare.mjs https://syllobus.com` を使用する。必要な場合のみ、その時点で権威DNSから確認したIPを `SYLLOBUS_TEST_RESOLVE_IP` に指定できる（TLS検証は無効にしない）。検証で使った架空データは削除済み。旧Vercelは削除していない。

## 依存監査

OpenNext/ESLint等のglob関連推移依存にnpm audit警告が残る。互換範囲内の更新を実施したが、audit提案の古いOpenNextへの強制ダウングレードは適用しない。本サービスは利用者からglob式を受け取らない。今後の上流修正版で更新する。


## 公開検証結果

Cloudflare版: https://syllobus.rawle026.workers.dev 。30件の回帰テスト、D1実ランタイムの保存・原子的置換・ロールバック・削除・並列レート制限、Lint、OpenNextビルドを確認。公開APIでセッション作成→架空1件保存→復元→削除、別セッションのGET/POST/DELETE拒否、少数集計抑制を確認し、架空レコード削除済み。Google Visionへの白紙PNG送信で「文字なし」400、不正ファイル400を確認。実成績画像は送信していない。

独自ドメインのCloudflare接続を確認済み。過去のSupabaseデータは未移行。workers.devと独自ドメインのブラウザ内データは別なので、必要な場合は元CSVを再選択する。

## 旧データ復旧の準備

`node scripts/export-legacy.mjs` は読み取り専用。先に3テーブルのアクセスを確認し、列を限定して全ページを取得、件数・主キー重複を確認し、2回目の全件取得とのハッシュ一致を検証する。成功時だけOS一時領域の専用ディレクトリ（0700、各ファイル0600）へバックアップと件数・SHA-256のmanifestを作る。ログに成績・セッションID・秘密鍵は出さない。

2026-11-19実行ではsubjectsが404で停止。credit_snapshots / grade_submissionsも別途404、公開REST schemaのテーブル数0を確認。これは「旧データが空」の証明ではなく、復元・公開スキーマ・権限等の確認が必要な状態。既存データを削除・再作成していない。

このスクリプトはD1へインポートしない。復旧後は旧保存を停止してエクスポートを実施し、実スキーマ・同意範囲・既存D1セッションとの競合を確認してからインポートする必要がある。D1で更新・削除されたデータを復活させない保護を含むインポート処理は、実データ構造確認後の残作業。エクスポートを公開ディレクトリやGitへ置かない。

追加検証（2026-11-19）: 回帰テスト37件、Lint、型チェック、OpenNextビルド成功。分離したHeadless Chromeで架空の単位修得CSVを選択し、レビュー→共有保存なしで確定→理学部・数学科・2024年度の専門単位比較まで確認。390px/1440pxの両幅で横はみ出しなし、比較表を目視確認。トップの固定値に残っていた「参加者集計」を「架空の表示例」へ修正し、実集計ではない旨を明記。
