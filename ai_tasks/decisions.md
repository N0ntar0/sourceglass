# Last Updated: 2026-08-05 14:40

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
