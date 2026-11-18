# 卒業要件の公式資料調査（2026-11-18）

大学公式の[認定基準一覧](https://www.osaka-u.ac.jp/ja/education/announcement/criteria)と[CELASの全学部一覧](https://www.celas.osaka-u.ac.jp/education/prerequisite/)を起点に、各学部の共通教育表と規程を確認した。現行の共通教育ページは入学年度ごとの経過措置を保証しないため、過去の入学生へ自動的に遡及しない。2026年度にも一律に適用確定とはしない。

| 学部 | 実装した資料範囲 | 専門・年度の残課題 |
|---|---|---|
|経済|[2019〜2024確認表](https://www.econ.osaka-u.ac.jp/wp-content/uploads/2025/03/sotsugyo-2019-2024.pdf)、[2025以降確認表](https://www.econ.osaka-u.ac.jp/wp-content/uploads/2025/03/sotsugyo-2025-.pdf)。大学小区分で専門・自由選択まで参考計算|読替、指定科目の厳密確認、外国語内訳、編入・転部|
|文|[共通教育表](https://www.celas.osaka-u.ac.jp/education/prerequisite/letters/)、人文学科|専修・卒業論文、年度別適用。規程の130単位だけで卒業可としない|
|人間科学|[共通教育表](https://www.celas.osaka-u.ac.jp/education/prerequisite/human-sci/)、専門基礎6|分野別実験・実習・卒業研究、年度別適用|
|外国語|[共通教育表](https://www.celas.osaka-u.ac.jp/education/prerequisite/foreign-s/)、基盤教養6と第1外国語6など|各専攻語の専門表、読替、年度別適用。2026年度[履修案内](https://www.sfs.osaka-u.ac.jp/_cms/wp-content/uploads/2026/03/risyu2026.pdf)は入学年度の便覧参照を求めている|
|法|[共通教育表](https://www.celas.osaka-u.ac.jp/education/prerequisite/law/)、法学科・国際公共政策学科|学科別専門・演習・履修上限、年度別適用|
|理|[学科別共通表](https://www.celas.osaka-u.ac.jp/education/prerequisite/science/)、専門基礎は数学/物理/化学25、生物24。2026生物の大区分を追加|専門内訳・必修・除外科目、物理の外国語条件。現行共通表を過去年へ流用しない|
|医・医学科|[共通教育表](https://www.celas.osaka-u.ac.jp/education/prerequisite/medicine/)、専門基礎14|臨床・進級・専門、教養の自然科学内訳、年度別適用|
|医・保健|同ページ。看護13／放射線16／検査18の専門基礎を専攻別に表示|専攻別専門実習、基盤教養を含む合算条件、年度別適用|
|歯|[共通教育表](https://www.celas.osaka-u.ac.jp/education/prerequisite/dentistry/)、専門基礎20|教養10の人文/社会内訳、専門実習、年度別適用|
|薬|[共通教育表](https://www.celas.osaka-u.ac.jp/education/prerequisite/pharmacy/)、専門基礎18|教養の合算条件、6年制・旧薬科学科、実務実習、年度別適用|
|工|[学科別共通表](https://www.celas.osaka-u.ac.jp/education/prerequisite/engineering/)、専門基礎24/26/20/26/26|コース別必修・高度国際への振替、年度別適用|
|基礎工|[学科別共通表](https://www.celas.osaka-u.ac.jp/education/prerequisite/engr-sci/)、専門基礎23/20/20/18|高度教養の開講学部制限、コース別専門、年度別適用|

理学部の追加根拠は[2026年度便覧・規程編](https://www.sci.osaka-u.ac.jp/ja/wp-content/uploads/2020/08/R8_ri_gakuseibinran_seikatu_kitei.pdf)の生物科学コースと生命理学コースの卒業要件。教養14、専門基礎24、専門67、国際性涵養15、総125で、4区分最低数の和120だけでは卒業単位を満たさない。UIは大区分を表示し、必修内訳まで自動検証したとは扱わない。

## 共通の実装判断

- 学部や学科を学籍番号から推定しない。選択が必要な学科・専攻は明示的に選んでもらう。
- 現行表との対照では修得単位・参考必要数を並べ、入学年度の適用が未照合なら充足判定を出さない。
- 大学が記載した区分も、卒業対象からの除外・他学部科目・重複算入・外国語の同一言語条件まで自動解決するわけではない。
- 全学部対応は今回「全学部の資料と対照画面」に拡張した。全学科・全入学年度の完全な卒業判定は未完了。推測の数値を増やすより、確認済み範囲と残課題を表示する。

## 2026-11-19の追加調査と実装

`lib/faculty-totals.ts` / `FacultyRequirements.tsx` に、大学CSVの明示区分から大区分を合算し、専門を含む最低数と比較する機能を追加した。高度科目は理学部等では大区分の内数、工学部では別枠として扱い、総計へ二重加算しない。不合格・対象外表示・未知の区分を勝手に専門科目へ補完しない。CSV区分だけでは算入上限・指定科目を保証できないため、卒業可能とは表示しない。

### 入学年度を照合済み：理学部

[2024年度便覧](https://www.sci.osaka-u.ac.jp/ja/wp-content/uploads/2020/08/R6gakuseibinran.pdf)、[2025年度便覧](https://www.sci.osaka-u.ac.jp/ja/wp-content/uploads/2020/08/R7gakuseibinran.pdf)、[2026年度便覧・規程編](https://www.sci.osaka-u.ac.jp/ja/wp-content/uploads/2020/08/R8_ri_gakuseibinran_seikatu_kitei.pdf)を個別に取得し、印刷ページ138・140・142・144・148の卒業要件を比較した。3年度で下記最低数は一致。必修科目表や読替まで同一と判断したわけではない。2023以前・2027以降に自動拡張しない。

|学科・コース|教養（高度含む）|専門基礎|専門|国際性（高度含む）|総計|
|---|---:|---:|---:|---:|---:|
|数学|14|25|62|15|124|
|物理|14|25|64|14|125|
|化学|14|25|72|15|128|
|生物科学|14|24|67|15|125|
|生命理学|14|24|67|15|125|

高度教養は2、国際性の内数である高度国際性は物理1、他学科2。総計を大区分最低数の和へ置き換えない。

### 現行規程との参考比較：過去入学年度への適用は未確認

- [文学部履修規程](https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG00000151.html)：教養14、専門78、国際性28。自由選択の算入は未判定。
- [人間科学部規程](https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG00000156.html)：通常課程の教養14、専門基礎6、専門教育62、国際性21、総128。英語課程は別表のため対象外。
- [法学部規程](https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG00000164.html)：共通32、高度教養2、高度国際性2、専門80、総132。学科別の必修内訳は未判定。
- [医学部規程](https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG00000183.html)：医学科は教養・国際性33、専門基礎14、専門166、総213。保健の専門は看護90、放射線87、検査101。臨床試験等の単位外条件は手動確認。
- [歯学部規程](https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG00000203.html)：教養18、専門基礎20、専門168、国際性17、総223。Post-CC PX等の条件は手動確認。
- [薬学部規程](https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG00000213.html)：教養14、専門基礎18、専門136、国際性18。特別科目の除外とコース別指定は要確認。
- [工学部規程](https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG00000221.html)：応用自然133、応用理工136、電子情報137、環境・エネルギー138、地球総合135の総計と各大区分を比較。高度科目は別枠、専門・高度国際性の兼用科目の振替は未自動化。
- [基礎工学部規程](https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG00000230.html)：10コースを明示選択。専門基礎／専門は電子の2コース23/81、化学の2コース20/80、機械・知能20/78、生物工学20/82、情報の3コース18/84。必修・選択群・高度科目の指定は手動確認。
- [外国語学部規程](https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG00000722.html)：履修方法・卒業論文は別に定めるため、専攻別最低数を推測せず共通教育参考表示を維持。

旧表の「専門未対応」から上記の大区分比較へ範囲を拡張した。全学部・全学科・全年度の卒業可否の完全自動判定ではない。
