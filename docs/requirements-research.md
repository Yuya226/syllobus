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
