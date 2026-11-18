# Cloudflare移行（2026-11-19）

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

現状のsyllobus.comはVercel DNS (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`)。Cloudflare zone追加済み、状態pending。ドメイン管理側で既存DNSレコード（メール等も含む）を確認・引き継ぎ、割当NS `corey.ns.cloudflare.com` と `deb.ns.cloudflare.com` へお名前.comで切り替える。既存WebレコードとのCustom Domain競合を避け、`syllobus.com/*` のWorkers Routeを設定済み。Web用A/CNAMEはプロキシ済み（オレンジ雲）が必要。架空のNS名やIPを設定しない。独自ドメインで保存・復元・削除を検証するまで旧Vercelを削除しない。

## 依存監査

OpenNext/ESLint等のglob関連推移依存にnpm audit警告が残る。互換範囲内の更新を実施したが、audit提案の古いOpenNextへの強制ダウングレードは適用しない。本サービスは利用者からglob式を受け取らない。今後の上流修正版で更新する。

ドメイン購入先はお名前.com。Cloudflare OAuthはzone.create権限がなく、開発者が管理画面でzoneを追加済み。DNSレコードの読み取り権限も403のため、プロキシ状態は管理画面で確認が必要。ルート設定成功を確認済み。最終確認時、.com権威DNSはまだVercel NSを返した。

## 公開検証結果

Cloudflare版: https://syllobus.rawle026.workers.dev 。30件の回帰テスト、D1実ランタイムの保存・原子的置換・ロールバック・削除・並列レート制限、Lint、OpenNextビルドを確認。公開APIでセッション作成→架空1件保存→復元→削除、別セッションのGET/POST/DELETE拒否、少数集計抑制を確認し、架空レコード削除済み。Google Visionへの白紙PNG送信で「文字なし」400、不正ファイル400を確認。実成績画像は送信していない。

ネームサーバー未切替のためsyllobus.comはまだVercel版。過去のSupabaseデータもまだ移行していない。workers.devを試す場合は元CSVを再選択する。
