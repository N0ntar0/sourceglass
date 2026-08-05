# Last Updated: 2026-08-05 21:30

# 決定台帳

**「なぜそうなっているのか」の唯一の入口。** 追記のみ。エントリを消さない。

各エントリは **決定 / 理由 / 詳細の在り処** だけを持つ。
実装の詳細をここに書き写さないこと（2箇所に書くと片方が必ず腐る）。

決定を覆す場合は、**古いエントリに `~~取り消し~~` を付けて残し、新しい番号で追記**する。

---

## 設計フェーズ（2026-08-04）

### D-001 プロダクト名を Sourceglass にする

当初仮称 TraceLens は npm・GitHub（AMD 公式ツール）・ドメイン・学術論文と衝突していた。
npm 名が取れないと、ロードマップにある「解析エンジンの npm 分離」が塞がる。
コード0行の時点なら改名コストがゼロだった。

あわせて **`Proof` / `Verify` / `Authentic` / `Proven` / `Detect`（AI検出の意味で）を
製品名・機能名・UI 文言のどこにも使わない**という命名規約を定めた。免責と矛盾するため。

→ `20260804_sourceglass_mvp_design/task.md` §3.4

### D-002 Hono を採用しない

Sourceglass は本質的にサーバーが不要で、Hono に実用的な役割がない。
CSP ヘッダ付与は `public/_headers` で足りる。

ただし将来「URL から画像を読む」（CORS のためプロキシ必須）と「解析エンジンの API 版」で
必要になるため、**解析エンジンを純粋関数として UI から完全分離**する設計にした。

→ `20260804_sourceglass_mvp_design/task.md` §3.2

### D-003 EXIF/XMP に ExifReader (MPL-2.0) を採用する

MIT の exifr は 2021年で更新停止・WebP 非対応。ExifReader は現行メンテ・WebP/AVIF 対応・
XMP/IPTC 内蔵・依存ゼロ。MPL-2.0 はファイル単位のコピーレフトなので、
**無改変で依存する限り MIT 本体と両立する**。

帰結: **ExifReader をフォーク・パッチしない。** 改変するとそのファイルが MPL-2.0 のままになる。

→ `20260804_sourceglass_mvp_design/task.md` §2.2 / `NOTICE`

### D-004 AI 関連の判定は IPTC 語彙に基づき、explicit と heuristic を分ける

文字列 grep ではなく `digitalSourceType`（IPTC NewsCodes）で判定する。
`algorithmicMedia`（非AI のアルゴリズム生成）を AI 扱いしないことが誤判定回避の要。

C2PA/IPTC の正式な表明（`explicit`）と、EXIF `Software` 欄のツール名（`heuristic`）を
**同じ強さで提示すると不誠実**になるため、`Signal.basis` で区別する。
verdict は3種のまま増やさない。

→ `20260804_sourceglass_mvp_design/task.md` §2.3, §3.3

### D-005 UI は英語 + 日本語切替にする

軽量な辞書オブジェクト方式。i18n ライブラリを入れない。
`ja` を `Record<TranslationKey, string>` にして翻訳漏れを型エラーにする。

→ `20260804_sourceglass_mvp_design/implementation_plan.md` Phase 4

### D-006 `✓` と緑を使わない。強調は地と図の反転にする

記号と色は文言より速く強く伝わり、「安全のお墨付き」と誤読される。
色相を使うのは AI 関連が見つかった場合だけ……ではなく、**色相を一切使わない**。

強調を「地と図の関係」として定義したので、ライト・ダーク両モードで自動的に成立する。
**反転は見出し行のみ。** ブロック全体の反転は「エラー・危険」の語彙になり、
AI 生成は危険ではないので意味が過剰になる。

`NO_PROVENANCE_INFORMATION` は破線、`NO_AI_RELATED_PROVENANCE_FOUND` は実線。
**この2つの混同がこの製品の最大のリスク**なので、記号・文言に加えて形でも差をつける。

→ `20260804_sourceglass_mvp_design/design.md`

### D-007 Web フォントを読み込まない

読み込んだ瞬間に外部リクエストが発生し、CSP でも弾かれ、
「画像は出ないが利用した事実は漏れる」状態になる。システムフォントのみ。
制約ではなく README に書ける事実として扱う。

あわせて **等幅は英数字にだけ使う**（日本語はフォールバックしてガタつく）。

→ `20260804_sourceglass_mvp_design/design.md` §5

### D-008 デザインは文書ではなくファイルで渡し、ガードで守る

デザインは引き継ぎで最も壊れやすい。原因は「実装者が CSS を書けないこと」ではなく、
**エージェントが善意で改善してしまうこと**と、**モックを分解する過程でズレること**。

対策として `src/styles/tokens.css` / `src/styles/base.css` / `src/components/Icon.tsx` を
設計担当が作成し、**編集禁止 + ハッシュ固定**にした。実装側はクラスを当てるだけで、
色・余白の判断が発生しない。`scripts/design-guard.mjs` が規約違反を CI で落とす。

ハッシュ固定は**意図的な摩擦**。色・余白・書体の変更が設計判断であることを思い出させるため。

→ `20260804_sourceglass_mvp_design/design.md` §8

### D-009 v0.2 は TrustMark。soft binding は解決せず、説明する

TrustMark は MIT で公式 JS/ONNX デコーダーが存在する。出力は `c2pa.soft-binding` であり、
**v0.1 の最大の弱点（メタデータは簡単に消える）を直接埋める**。
ウォーターマークの復元は推測ではなく離散的な事実なので、製品思想を壊さない。

ただし 100bit の識別子を解決するにはマニフェストリポジトリへの外部照会が必要で、
No network 原則と衝突する。**事実は出し切り、解決しない理由を明示する**（方針B）。

モデルは必ず自前ホストする。第三者からの取得は「誰がいつ使ったか」の漏洩になる。

→ `20260804_sourceglass_mvp_design/roadmap.md`

### D-010 v0.2 を見据えて v0.1 に3つの抽象を先入れする

Detector レジストリ / `AnalysisInput`（bytes と pixels の遅延分離）/ `coverage`。
v0.2 で TrustMark を足すときに書き直しにならないようにするため。

当初4つ目に予定していた Worker 化は **D-013 で取り下げた**。

→ `20260804_sourceglass_mvp_design/implementation_plan.md`

---

## Phase 0 レビュー（2026-08-05）

実測は `20260804_sourceglass_mvp_design/spike_result.md`。
実装指示は `implementation_plan.md` の「Phase 0 の決定事項」に D1〜D6 として記載。

### D-011 remote manifest fetch の保証は CSP に置く（= 実装計画 D1）

`remoteManifestFetch` は WASM に存在するが c2pa-web 0.13.1 の公開型には無い。
実行時に受理されたが、**受理されたことは効いていることの証明ではない**。
「検証できないことを主張しない」製品が、ここで例外を作れない。

保証は CSP `connect-src 'self'`。SDK 設定（`remoteManifestFetch` / `ocspFetch`）は
**効かなくても安全**な多層防御として渡す。型拡張は1ファイルに閉じ、
パッケージ型への declaration merging はしない。

→ 検証は remote-only fixture で Phase 2 の完了条件

### D-012 開発も HTTPS にする（= 実装計画 D2）

`workerSrc` が HTTP を拒否する。「開発は HTTP + Blob Worker、本番は HTTPS」だと、
**CSP の破綻を本番でしか発見できない**。CSP がこの製品の中心的な保証である以上、
そこを二重化するのは筋が悪い。

CSP は1本。`blob:` を入れない。`_headers` は `/*` に当てる（Worker のレスポンスにも必要）。
e2e はビルド成果物 + 本番ヘッダに対して実行する。

副次効果: v0.2 の TrustMark が WebGPU に secure context を要求するため、どのみち必要になる。

### D-013 独自 Worker を v0.1 では作らない（= 実装計画 D3）

c2pa-web が内部 Worker を持っており、メインスレッド停止は実測 **0.4 ms / Long Task 0件**。
その上に自前 Worker を重ねても、structured-clone のコストと複雑さが増えるだけ。

D-010 の4つ目を取り下げる。ただし **structured-clone 可能・DOM 非依存の制約は維持**する。
目的は「いつでも Worker 化できること」であって「今 Worker を作ること」ではない。

積み残し: **ExifReader は JS でメインスレッド実行**。10MB 級での測定が Phase 2 の完了条件。

### D-014 C2PA SDK は遅延ロードする（= 実装計画 D4）

WASM が raw 8.27MB / gzip 3.03MB（実測）。トップ画面で読むのは論外。
初回解析時に動的 `import()`。SDK はシングルトン、`free()` は `finally` で必ず呼ぶ。

### D-015 C2PA の例外を独自コードに変換する（= 実装計画 D5）

C2PA 無し → `null`（`absent`）、破損/0バイト → **例外**（`error`）。同じ経路にできない。
例外に機械可読な `code` は無い。**message 文字列を verdict 判定に使わない。**
境界で `C2paErrorCode` に変換する（message は診断表示のためだけに保持してよい）。

### D-016 integrity と signerTrust を型で分離する（= 実装計画 D6）

**`validation_state: "Valid"` と `signingCredential.untrusted` は同時に成立する**（実測）。
`Valid` は「ハッシュと署名の整合」であって「発行者が信頼できる」ではない。
**1つのフィールドにまとめたらこの製品は嘘をつく。**

`signingCredential.untrusted` を `'not-trusted'` にマップしない。
Sourceglass が意図的にトラストリストを設定していないだけなので、**MVP は常に `'not-evaluated'`**。

帰結: **`integrity === 'invalid'` の manifest から AI シグナルを `explicit` として採用しない。**
改ざん検知に失敗した記録の中身は信頼できない。

---

## Phase 1（2026-08-05）

### D-017 `@types/*` は個別承認を不要とする

DefinitelyTyped の型定義はビルド時に消えるため、依存ポリシーの3基準
（実行時ネットワーク / ライセンス / メンテナンス）のどれにも触れない。
個別承認していると、`@types/*` が必要になるたびに往復が発生して意味がない。

条件: `devDependencies` に置く / 実行時コードを含まない /
**`@types/node` のメジャーは実際に使う Node のメジャーに合わせる**（CI も固定）。

→ `AGENTS.md` §依存パッケージ

### D-018 `.gitignore` に `.env` 系と `*.pem` を含める

`.gitignore` の役割は「今あるもの」ではなく「事故で入りうるもの」を止めること。
このリポジトリは**すでに public** なので、間違えて commit した時点で漏洩が確定する。
`*.pem` は D-012 で開発を HTTPS にした結果、新しく生じたリスク。

`ai_tasks/` / `fixtures/` / `.vscode/` は**意図的に除外しない**。

---

## Phase 1 レビュー（2026-08-05）

### D-019 `features/provenance/` の境界を eslint で強制する

`AGENTS.md` §2.1 の「解析エンジンは React / DOM に依存しない」は、現状**規約でしか守られていない**。
Phase 2 でエンジンを書き始める前に、`no-restricted-imports` で機械的に落とすようにする。

デザインを `design-guard` で守ったのと同じ考え方。**規約は破られるが、CI は破られない。**

→ 実装は Phase 2 の冒頭

### D-020 エンジンのテストは node 環境で走らせる

Vitest の既定環境を `node` のままにし、jsdom を**ファイル単位でのみ**有効にする
（UI テストに `// @vitest-environment jsdom`）。

こうすると `features/provenance/` のテストは DOM が存在しない環境で走るので、
**DOM 依存が混入した瞬間にテストが落ちる**。D-019 と二重に境界を守れる。

Phase 1 の `App.test.tsx` が `renderToStaticMarkup` を使って jsdom を回避しているのは、
この方針と整合している。

### D-021 `eslint-plugin-react-hooks` を Phase 3 用に事前承認する

dev 依存・実行時コード無し・MIT。UI を書く段階で必ず必要になるため、
Phase 3 で止まらないよう先に承認しておく。

---

## Phase 2 レビュー: ExifReader の停止時間（2026-08-05）

実測は `20260805_sourceglass_phase2/measurement.md`。

### D-022 遅いのはファイルサイズではなくメタデータ量である

13.3 MB の通常 JPEG は **0.1〜1.5 ms**、11.0 MB の巨大 XMP JPEG は **2,856〜3,765 ms**。
ExifReader は画像本体を読み飛ばすのが速く、**巨大な XMP テキストノードの処理だけが遅い**。

したがって対策は「実行場所を変えること」ではなく「**処理量を上限で縛ること**」になる。
Worker は仕事の量を減らさない。UI が固まる代わりにスピナーが3秒回るだけで、
110 MB の XMP なら30秒回り続ける。**本当の欠陥は処理量が無制限であること。**

### D-023 EXIF/XMP は解析前にコンテナを走査し、上限を超えたら読まない

JPEG の APPn マーカー / PNG のチャンク / WebP の RIFF チャンクを長さフィールドで
飛ばしながら数えるだけの走査を、ExifReader の前に置く。マイクロ秒で終わる。

**この走査は新規の仕事ではない。** `copy.md` §3.5 で「メタデータ領域そのものが無い」と
「領域はあるが技術情報のみ」を事実として区別すると決めており、それを言うために
どのみち必要だった。

```ts
export const METADATA_BYTES_LIMIT = 262_144; // 256 KiB（EXIF + XMP + IPTC の合計）
```

**256 KiB の根拠:** 実測の約 290 ms/MB から逆算して最悪 ~75 ms。
実世界の EXIF は 10〜60 KB、履歴付き XMP でも数百 KB には届かない。
**正常なファイルは全部通り、病的なものだけ落ちる。**
C2PA は含めない（c2pa-web が自前 Worker で扱う）。

セグメント走査ができないコンテナ（AVIF / HEIC）は、ファイルサイズ 8 MiB を粗い代替上限とする。
README で best-effort と明記している形式なので、精度より安全側に倒す。

### D-024 EXIF/XMP detector を Worker 化しない。ただし再開条件を明文化する

D-013 を維持する。上限を入れれば**実測で遅いケースが1つも残らない**ため、
Worker を建てるのは D-013 が実測を根拠に却下したのと同じ先回りになる。

ただし 256 KiB という上限値は**外挿にすぎない**。次を満たしたら決定を見直す。

> **上限ぎりぎり（250 KB 程度のメタデータ）のフィクスチャで 50 ms を超える停止が
> 観測されたら、EXIF/XMP detector を Worker 化する。**

「今は不要」と「永久に不要」は違う。判断の根拠が数字である以上、数字が変われば決定も変わる。

### D-025 `MetadataReader` ポートを今作り、実装は inline にする

Worker を作らない代わりに、**境界だけ先に引く**。将来 Worker を足すときに
エンジンを書き直さないため。

```ts
// features/provenance/ports/metadataReader.ts
export interface MetadataReader {
  read(bytes: ArrayBuffer): Promise<RawMetadata>;
}
```

- v0.1 の実装は inline（ExifReader を直接呼ぶ）。`provenance/` 内に置くので
  **CLI / npm 単体でも動く**
- 将来の Worker 実装は `platform/` に置き、runner へ注入する。**エンジン側の変更はゼロ**
- `read` は最初から `Promise` を返す。同期実装でも将来の非同期実装でも署名が変わらない

**`timeoutMs` を引数に入れない。** inline 実装では同期処理を中断できないため、
受け取っても守れない。**守れない約束を型に書かない。**
タイムアウトは Worker 実装を入れる時に、その実装の内部で実現する。
エラーコードだけは先に定義しておくので、後から追加してもエンジンは変わらない。

```ts
export type MetadataErrorCode =
  | 'METADATA_TOO_LARGE'      // 上限超過。ExifReader を呼ばずに中止する
  | 'METADATA_READ_TIMEOUT'   // 定義のみ。Worker 実装を入れるまで発生しない
  | 'METADATA_PARSE_FAILED'
  | 'CONTAINER_UNREADABLE';
```

### D-026 上限超過は `error` + `coverage.failed`。**表示までが要件**

`broken-huge-exif` は `SourceResult.error`（`METADATA_TOO_LARGE`）となり、
`coverage.failed` に `exif` と `xmp` の両方が入る。

**ここが落とし穴。** exif と xmp が error で c2pa が absent だと、
verdict は `NO_PROVENANCE_INFORMATION` になる。しかし
**「読み取れなかった」を「情報が無い」として見せたら `AGENTS.md` §2.4 違反**になる。

- `coverage.failed`（「読み取れなかったもの: EXIF, XMP」）を**必ず表示する**
- `emptyReason` に「領域が存在しません」を出してはいけない。**領域は存在した**
- 文言は `copy.md` の `emptyReason.tooLarge`

### D-027 自由記述値は切り詰めて格納する

上限内でも 250 KB の `dc:Description` は起こりうる。レポートに素通しすると
structured-clone と DOM 描画が詰まる。

- **1値あたり 512 文字**で切り詰め、`{ truncated: true, originalLength: n }` を持たせる
- **配列は最大 50 要素**
- **切り詰めた事実を UI に出す。** 隠すと「全部見た」と誤解される（`copy.md` の `value.truncated`）
- 原文は保持しない

### D-028 巨大フィクスチャをリポジトリに入れない

`fixtures/` は未追跡だが `.gitignore` にも無く、このままだと
`performance-large.jpg`（13.3 MB）と `broken-huge-exif.jpg`（11.0 MB）が
**public リポジトリの履歴に永久に残る**。git の履歴は消せない。

D-023 で上限を 256 KiB にしたので、**巨大なフィクスチャはもう必要ない**。

- `broken-huge-exif.jpg` はメタデータ約 300 KB（ファイル約 320 KB）で作り直す。
  上限を超えることが目的であり、11 MB である必要はない
- `performance-large.jpg` は**コミットしない**。測定は `measurement.md` に記録済み
- 代わりに **`xmp-large-within-limit.jpg`（メタデータ約 250 KB）** を追加する。
  D-024 の再開条件を判定するための実測用
- 生成物なので `build-fixtures.sh` で再現できる。**これは「再保存禁止」の対象外**
  （実物のメタデータを保存した資産ではなく、こちらが生成した合成物のため）

---

## Phase 2 実装レビュー（2026-08-05）

対象: `feature/phase2-provenance-engine` / `6c49526`。
Vitest 31件・Playwright 7件・typecheck・lint・design:guard・build がすべて通ることを実測確認済み。

### D-029 `SourceResult` に `not-checked` を追加する

runner がスキップした detector に `{ status: 'absent' }` を入れていた。
**`absent` は「調べたが無かった」であり、「調べていない」ではない。**
`selectors.ts` も欠損キーを `absent` に落としており、区別が二重に潰れていた。

今は影響が小さいが **v0.2 で致命的**になる。TrustMark は `deferred` なので既定では実行されず、
`results.trustmark = absent` は「ウォーターマークを調べたが無かった」という意味になる。
実際には一度も見ていない。

```ts
| { status: "not-checked"; reason: "unsupported" | "not-requested" | "unavailable" }
```

`AGENTS.md` §2.4 の「3状態を潰すな」は**区別を減らすなという意味であり、増やすなではない。**

### D-030 `validation_state: "Trusted"` は `signerTrust: 'trusted'` にマップする

D-016 に矛盾する2つの記述があった（表は `'trusted'`、本文は「MVP では常に `'not-evaluated'`」）。
**設計側の記述ミス。** 実装は本文に従い、テストで `not-evaluated` を固定していた。

正しい解釈: **`Trusted` はトラストリストを設定して初めて発生する。**
Sourceglass は設定していないので現状は到達しない。だからこそマッピングは今書いておく。
将来トラストリストを入れたときに `Trusted` が黙って `not-evaluated` に落ちる事故を防ぐため。

`signingCredential.untrusted` を `'not-trusted'` にしない点は D-016 のまま変更なし。

### D-031 上限は ExifReader が読むセグメントをすべて数える

`metadataBytes` が APP1（Exif / XMP）と APP13 しか数えていなかった。
しかし `expanded: true` の ExifReader は **ICC プロファイル（APP2）も解析する**。
ICC は数 MB になりうるため、巨大な ICC は上限をすり抜けて ExifReader に渡る。

D-023 の目的は「ExifReader が噛む量を縛ること」なので、ここは穴だった。

- JPEG: **APPn を全部**数える
- PNG: `eXIf` / `iTXt` / `tEXt` / `zTXt` / `iCCP`
- WebP: `EXIF` / `XMP ` / `ICCP`

無関係な APPn まで数える分には安全側に倒れる。`huge-icc` フィクスチャを追加する。

### D-032 e2e のハーネスと本番成果物を分ける

`test:e2e` が `build:e2e`（エントリ追加 + `assetsInlineLimit: 0`）の成果物を使っており、
**出荷するバイト列と別のものをテストしていた**（`index-B5nkaHvQ.js` 対 `app-9V5DH0cR.js`）。

D-012 で「e2e はビルド成果物 + 本番ヘッダに対して実行する」と決めたのは、
開発と本番の差で CSP の破綻を見逃さないためだった。前提が崩れていた。

- `privacy.spec.ts` → **`vite build` の成果物**に対して実行する（出荷するものそのもの）
- `provenance.spec.ts` → ハーネスビルドで実行してよい

`assetsInlineLimit: 0` は既定 4096 バイトなので 8 MB の WASM には元々効かない。不要なら外す。

### D-033 C2PA の生成ツールは両方のフィールドから取る

`claim_generator_info` しか読んでいなかったが、実測 JSON（`spike_result.md`）にあるのは
`claim_generator`（文字列）で、`claim_generator_info` は存在しない。
**公式フィクスチャでは生成ツールが常に空になる。**

テストが通っていたのは `claimGenerators` を検証するテストが1つも無かったため。
**「実測 JSON を見て実装する」という Phase 0 の原則が、ここだけ抜けていた。**

両方を読み、アサーションを追加する。

### D-034 UI は `not-checked` を「記録が無い」と表示してはならない

D-029 の修正で `results` は真実を持つようになったが、**verdict は3種のままなので、
未対応形式では `NO_PROVENANCE_INFORMATION` になる**（`withMeaningfulData` が空のため）。

「この画像については何も判断できません」は正しいが、
**「来歴の記録が残っていませんでした」は正しくない。** 記録の有無を見ていない。

Phase 3 の要件として、`results` に `not-checked` が含まれるときは
`emptyReason.noSegment` ではなく `emptyReason.notChecked` を出す。

→ `copy.md` §3.5

---

## Phase 3 実装レビュー（2026-08-05）

対象: `feature/phase3-ui` / `d0c13a6`。
typecheck / lint / design:guard / build / Vitest 47件 / provenance E2E 6件 / app E2E 8件の
通過を実測確認済み。**privacy E2E に画像解析経路が入り、README の主張と検証内容が初めて一致した。**

### D-035 heuristic の文言は「由来」で使い分ける

`basis: 'heuristic'` には2つの由来がある。

1. メタデータの自由記述欄に AI ツール名があった
2. **C2PA に記録はあるが整合性チェックに失敗した**（D-016 の降格）

2 に対して「メタデータの Software 欄などに書かれていたものです」と表示するのは
**事実として誤り**。由来は C2PA であって自由記述欄ではない。

**AI 側に振れたときこそ正確に書く。** 不正確さが許されるのは、こちらに不利な方向だけではない。

→ `copy.md` に `result.ai.tampered.note` を追加。見出しは `result.ai.explicit.heading` を使う
（記録が見つかった事実は同じであるため）。設計側の文言漏れだった。

### D-036 `not-checked` は `reason` で表示を分ける

UI が `results` に `not-checked` が1つでもあれば「この形式は解析できません」と表示していた。

現状は未対応形式のときしか発生しないため正しく見えるが、
**v0.2 で TrustMark が `deferred` になると、毎回 `not-requested` が出る。**
その瞬間、すべての「記録なし」結果が「この形式は解析できません」に化ける。

- `reason: 'unsupported'` → `emptyReason.notChecked` を出す
- `reason: 'not-requested'` → **出さない。** `coverage` に載せるだけ

同じ理由で `coverage.skipped`（"Not applicable to this format"）も
`not-requested` には使えない。**`reason` を捨てないこと。**
D-029 で `reason` を型に入れたのは、まさにこの区別のためだった。

---

## Phase 4 レビュー（2026-08-05）

対象: `feature/phase3-ui` / `b2c6922`。
typecheck / lint / design:guard / build / Vitest 56件 / provenance E2E 6件 / app E2E 14件の
通過を実測確認済み。**日本語の重要文言は `copy.md` と一字一句一致していた。**

### D-037 等幅ブロックに出る文言は日本語版でも英語のままにする

`copy.md`（`value.truncated` に日本語を定義）と
`design.md` §5（等幅ブロックに日本語を入れない）が**衝突していた。設計側の記述ミス。**

実装は `design.md` を優先して英語のままにしており、**判断としては正しい。**
`copy.md` 側を修正し、英語のままにするキーの一覧を明記した。

対象は等幅（計測器パート）にのみ現れるもの:
`value.truncated` / `section.*` / `details.*` / `status.*`。

**Summary の値（`summary.found` =「検出」など）は日本語で良い。**
`.summary__val` は等幅だが2〜4文字なので破綻しない。
この規則が本当に守りたいのは、長い英語のフィールド名と値が並ぶ**詳細テーブル**である。

> 運用上の指摘: 設計文書どうしが矛盾していた場合も、
> **黙って片方を選ばず相談する**（`AGENTS.md` §1.6）。今回は結論が正しかったが、
> 矛盾が記録されないまま残ると次に同じ判断を繰り返すことになる。

---

## パッケージマネージャ（2026-08-05）

### D-038 npm のままにする。pnpm への移行は v0.3 のエンジン分離と同時に行う

**判断: 今は npm。** 移行の是非ではなく、移行の**タイミング**の問題として扱う。

**今 pnpm にしない理由:**

1. **コントリビューターの導線**。このリポジトリは「主張を信用しなくていい、
   コードを読んで確かめてくれ」と README で言っている。その読者にとって
   `pnpm-lock.yaml` は最初の一歩でつまずく理由になる。
   Star が付く前の pre-alpha で導線を1段階増やす価値は無い
2. **再検証コストが実利を上回る**。pnpm の厳格な node_modules は、
   Phase 0 で実測した事実をすべて確認し直すことになる
   （`c2pa.wasm?url` / `c2pa_worker?url` の解決、8MB WASM の同一オリジン配信、
   privacy E2E が本番ビルドのハッシュに一致すること）。
   **動いているものを壊す可能性のある変更を、「インストールが少し速い」ために入れない**
3. **今の痛みが package manager 由来ではない**。依存は10個強で、
   `AGENTS.md` が追加を原則禁止にしているため今後も増えない。
   pnpm が解く問題（インストール速度 / phantom dependency / monorepo）を、
   このプロジェクトはまだ持っていない

**pnpm が本当に効く点（公平のため記録）:**

厳格な node_modules は「依存は明示的に管理する」という方針と思想的に合う。
`package.json` に無い推移的依存の import が即エラーになるので、
規約ではなく仕組みで守れる（デザインガードや eslint 境界と同じ発想）。
ただし現状 `src/` の import は4パッケージだけで全て宣言済みのため、効果は理論上に留まる。

**移行するタイミング（トリガー）:**

> **v0.3 の「解析エンジンを npm パッケージとして分離」でモノレポになる時。**

そこで pnpm workspaces の価値が出る。「移行」ではなく「構成変更のついで」になるため
コストが実質ゼロになり、実測の再検証も v0.1 のタグを基準にできる。

**それより早く移行する場合の条件:**

1. `packageManager` フィールドと corepack で固定し、README（英日両方）に手順を書く
2. Phase 0 の実測項目を再確認する（WASM と worker のパス解決、
   privacy E2E が本番ビルド成果物に当たること）

### D-039 ブランチ運用は git-flow 風。`main` は v0.1 リリース時に初めて更新する

- **`develop`** — 統合先。GitHub のデフォルトブランチ（= PR のベース）
- **`feature/*`** — `develop` から切って `develop` へ戻す
- **`main`** — リリース線。**v0.1 で `develop` をマージするまで触らない**

`main` が遅れている状態は放置ではなく仕様。リリース済みの姿だけが載る。

GitHub のデフォルトを `develop` にしたのは、PR のベースがデフォルトブランチと同一で、
main のままだと**誤って main を対象にした PR が出る**ため。
副作用としてトップページが `develop` を表示するが、pre-alpha では実装込みの現状が
見える方が正しい。

branch protection を掛けるなら **`main`**（develop は日常的に push するため）。

---

## Phase 5 レビュー（2026-08-05）

対象: `feature/phase3-ui` / `b86725a`。
README 英日の節構成15/15、Known limitations 8/8、ローカルリンク各9件の実在を確認済み。
Development に列挙されたスクリプト9件はすべて `package.json` に存在する。

### D-040 禁止語ルールは「主張」に適用する。「否定」には適用しない

Phase 5 で、**免責文が禁止語ルールを避けるために弱められた。**

- 「証明するものではありません」→「根拠にはなりません」
- "does not prove" → "does not establish"
- **`AI probability: 87%` という具体例そのものが削除された**
- "We would rather prove this than claim it." → "Sourceglass makes this claim inspectable"

動機は `AGENTS.md` §1.3 の `Proof` / `Proven` 禁止だが、**ルールの適用範囲が広すぎた。
設計側の記述ミス。**

このルールが止めたいのは「Sourceglass がそれをした」と読める用法である。
**否定文で限界を述べるための使用は、ルールの目的そのもの。**
言い換えると免責が弱くなり、ルールが意図と逆に働く。

`AGENTS.md` §1.3 に適用範囲の表を追加した。判断基準は
**「その文はこちらの能力を大きく見せているか、小さく見せているか」**。
小さく見せているなら、禁止語が入っていても正しい。

なお `design-guard` は README を検査しない（`SCAN_DIRS = ['src']`）。
`AI probability: 87%` を消す技術的必要は無かった。

**帰結:** `copy.md` §6 の確定文（英日とも）へ戻す。
`Detect` → `found` の言い換え（"not detected" → "cannot be found"）は
`AGENTS.md` §1.3 の指示どおりで、こちらは正しい適用。

---

## Phase 6 レビュー / v0.1（2026-08-05）

### D-041 CI の `dist/` 外部 origin 検査は、テキストファイルだけを見ている

`.github/workflows/ci.yml` の検査は `grep -RIhoE` を使っており、`-I` によって
**バイナリファイルを飛ばす**。つまり **WASM の中身は検査されていない。**

実際、同梱の `c2pa_bg.wasm` には `c2pa.org` / `cipa.jp` / `cv.iptc.org` などの
文字列が含まれる（いずれも仕様・名前空間の識別子であり、取得先ではない）。

**これは欠陥ではないが、検査の守備範囲を正確に理解しておく必要がある。**

| 層 | 何が担保するか |
| --- | --- |
| ビルド成果物のテキスト | CI の origin 検査 |
| **バイナリ（WASM）** | **検査対象外** |
| 実行時の通信 | **CSP（保証）+ privacy E2E（検証）** |

保証は元々 CSP に置いてある（D-011）。origin 検査は「うっかり外部 URL を書いた」を
早期に捕まえる補助であり、**これ単体を根拠に「外部参照はゼロ」と言わないこと。**

### D-042 v0.1 の CSP 実測は本番と preview の両方で確認済み

`public/_headers` を置いただけでは何も保証していない、という Phase 6 の中心課題は解消した。

- `https://sourceglass.pages.dev/`（HTML / C2PA Worker）
- `https://develop.sourceglass.pages.dev/`（HTML / C2PA Worker）

いずれも `public/_headers` と同一の CSP を返す。**`/*` が Worker スクリプトにも
適用されることを実測できた**（D-012 の前提が本番で成立）。

設計担当が独立に確認した事実:

- **本番が配信する `index-srsxaQV6.js` は、レビュー対象コミットのローカルビルドと同一ハッシュ**。
  本番はレビューしたコードそのものである
- WASM は `application/wasm` として同一オリジンから配信されている
- Cloudflare が `referrer-policy` と `x-content-type-options: nosniff` を追加している（有害ではない）

記録: `ai_tasks/20260805_sourceglass_phase6/deploy_verification.md`

### D-043 タグを打つ前に README の Status を確認する

**v0.1.0 のタグとリリースは、README が「Nothing here is released yet /
まだリリースされていません」と書いたまま作成された。**
README の更新が作業ツリーに残ったままコミットされず、そのままマージ・タグまで進んだ。

コードとデプロイは正しく、CSP 実測も済んでいた。**壊れていたのは説明だけ**だが、
「リリース済みのタグが未リリースだと言っている」状態は、この製品が最も避けたい
**書いてあることと実態の不一致**そのものである。

再発防止として、リリース手順に次を入れる。

```bash
# タグを打つ前に必ず実行する
grep -n "pre-alpha\|Nothing here is released\|まだリリースされていません" README.md README.ja.md
# 何かヒットしたら、タグを打たない
```

`git status` が clean であることは「変更を保存した」ことを意味しない。
**意図した変更が入っているかは、内容で確認する。**
