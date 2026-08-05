# Last Updated: 2026-08-04 21:30

# Sourceglass MVP 実装計画（CodeX 向け作業指示書）

前提: [`task.md`](./task.md) の調査結果・決定事項と [`roadmap.md`](./roadmap.md) を必ず先に読むこと。

想定工数: **合計 6〜7.5 人日**（Phase 0 を飛ばさないこと）

> **v0.2（TrustMark = 画素層のウォーターマーク検出）が確定しているため、
> v0.1 の時点で 3 つの抽象を先に入れる。** 詳細は [`roadmap.md`](./roadmap.md)。
>
> 1. **Detector レジストリ** — 固定の `c2pa/exif/xmp` フィールドをやめ、登録制にする
> 2. **`AnalysisInput`** — 「バイト列」と「画素」を遅延・分離して供給する
> 3. **`coverage`** — 何を検査したかを Report に持たせる（免責文言の強さを連動させる）
>
> 当初4つ目に予定していた **Worker 化は v0.1 では実装しない**（Phase 0 の実測による。§ Phase 0 の決定事項）。
> ただし「いつでも Worker 化できる」制約（structured-clone 可能・DOM 非依存）は維持する。

---

## Phase 0 の決定事項（実測にもとづく確定・2026-08-05）

実測結果は [`spike_result.md`](./spike_result.md)。以下は**決定**であり、再検討しない。

### D1. remote manifest fetch — 保証は CSP に置く

`remoteManifestFetch` は WASM には存在するが c2pa-web 0.13.1 の公開型には無い。
実行時に受理されたが、**受理されたことは効いていることの証明ではない。**
未公開設定に「画像が外に出ない」という保証を負わせない。

| 層 | 手段 | 役割 |
| --- | --- | --- |
| 1. **保証** | CSP `connect-src 'self'` | ブラウザが遮断する。ライブラリ内部に依存しない |
| 2. **多層防御** | `remoteManifestFetch: false` / `ocspFetch: false` | 局所的な型拡張。**効かなくても安全**な位置づけ |
| 3. **検証** | remote-only fixture + e2e で外部リクエスト0件 | **Phase 2 の完了条件** |

- WASM の strings に `ocsp_fetch` もある。OCSP 照会もネットワークなので同じ扱いにする
- 型拡張は `detectors/c2pa/settings.ts` の**1ファイルに閉じる**。
  パッケージへの declaration merging は**しない**（アップグレード時に静かに壊れる）
- 上流（contentauth/c2pa-js）へ公開型に追加する issue を出す
- **README に「SDK の設定で無効化している」と書かない。「CSP が遮断する」と書く**

`verifyTrust` は **`true` のまま**にする。`false` にすると `signingCredential.untrusted` が
消えてしまい（実測済み）、trust を評価していない事実を UI に出せなくなる。

```ts
// detectors/c2pa/settings.ts
export const VERIFY_SETTINGS = {
  verifyAfterReading: true,
  verifyTrust: true,
  // ↓ c2pa-web 0.13.1 の公開型には無い。多層防御としてのみ渡す。
  //   保証は CSP 側にある。これが効かなくても外部通信は発生しない。
  remoteManifestFetch: false,
  ocspFetch: false,
} as const;
```

**remote-only fixture の作り方**（Phase 2 で作成）:
埋め込みマニフェストの無い JPEG に、XMP `dcterms:provenance` で
`https://example.invalid/manifest.c2pa` を指す URL を書き込む。
`example.invalid` は必ず解決に失敗するため、遮断できたかがリクエストログで明確に出る。

### D2. Worker と CSP — 開発も HTTPS に統一する

`workerSrc` は HTTP を拒否する（実測）。当初案の「開発は HTTP + Blob Worker、
本番は HTTPS + 同一オリジン Worker」は**却下**。
**開発で通した構成と本番の構成が違うと、CSP の破綻を本番でしか発見できない。**

- 開発・プレビューとも **HTTPS**（`@vitejs/plugin-basic-ssl` を dev 依存として承認）
- `workerSrc` は開発・本番とも**同一オリジン URL**
- **CSP は1本だけ。`blob:` を `worker-src` / `script-src` に入れない**
- 副次効果: v0.2 の TrustMark が WebGPU に secure context を要求するため、どのみち必要になる

確定 CSP:

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self';
style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self';
font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none';
frame-ancestors 'none'
```

- **`_headers` は `/*` に当てる。** Worker スクリプトのレスポンスにも CSP が乗る必要がある。
  乗らないと Worker 内が CSP 非適用で動きうる
- **e2e は dev サーバーではなく、ビルド成果物 + 本番ヘッダに対して実行する**
- Playwright は自己署名証明書のため `ignoreHTTPSErrors: true`

### D3. 独自 Worker は v0.1 では作らない

C2PA 解析のメインスレッド停止は実測 **最大 0.4 ms / Long Task 0件**。
c2pa-web が内部 Worker で WASM を実行しているため。

- **`src/workers/inspect.worker.ts` は作らない。** SDK の Worker の上に自前 Worker を重ねても、
  structured-clone のコストと複雑さが増えるだけで得るものがない
- ただし**エンジンの制約は維持する**（structured-clone 可能・DOM 非依存）。
  目的は「いつでも Worker 化できること」であって、「今 Worker を作ること」ではない
- v0.2 の ONNX は「detector 単位の実行戦略」として `runner` 側に足す。
  **`Detector` インターフェースは実行場所を知らない**

**未確認として残るもの:** ExifReader は JS でメインスレッド実行される。
大きなファイル（10MB 以上）での停止時間を **Phase 2 で測定する**（完了条件）。
50ms を超えるようなら EXIF/XMP detector だけ Worker 化を検討する。

### D4. C2PA SDK は遅延ロードする

WASM は raw **8,269,371 bytes** / gzip **3,027,183 bytes**（実測）。
トップ画面でこれを読むのは論外。

- **C2PA SDK は初回解析時に動的 `import()` で遅延ロードする**
- SDK インスタンスは**シングルトン**にする（初期化 125ms + Worker 生成が毎回走らないように）
- `reader.free()` は `finally` で必ず呼ぶ
- README の Known limitations に「初回解析時に約3MBのモデル/WASM を同一オリジンから取得する」旨を書く

### D5. C2PA API の実際の形（推測禁止・実測済み）

```ts
const c2pa = await createC2pa({ wasmSrc, workerSrc });  // ★ Promise を返す。await が必要
const reader = await c2pa.reader.fromBlob(mimeType, blob);
// reader は C2PA が無いとき null
const store = await reader.manifestStore();
```

- `manifests` は**配列ではなく manifest label をキーにした object**
- assertion の実ラベルは `c2pa.actions.v2`
- `digitalSourceType` の実パス:
  `manifests[<label>].assertions[n].data.actions[m].digitalSourceType`
- **C2PA 無し → `reader` が `null`**（例外ではない）→ `SourceResult.absent`
- **破損 → 例外** `C2pa(InvalidAsset("..."))` → `SourceResult.error`
- **0バイト → 例外** `C2pa(UnsupportedType)` → `SourceResult.error`
- 例外に機械可読な `code` は無い。**message 文字列を verdict 判定に使わない。**
  境界で独自コードに変換する（診断表示のためだけに message を保持してよい）

```ts
export type C2paErrorCode =
  | 'C2PA_INVALID_ASSET'
  | 'C2PA_UNSUPPORTED_TYPE'
  | 'C2PA_READ_FAILED';   // 分類できないものはすべてこれ
```

### D6. integrity と trust を分離する（最重要）

実測: **`validation_state: "Valid"` と `signingCredential.untrusted` は同時に成立する。**

`Valid` は「ハッシュと署名の整合が取れている」であって「発行者が信頼できる」ではない。
**この2つを1つのフィールドにまとめたら、この製品は嘘をつく。**

型は §2.1 を参照。マッピング規則:

| 実測値 | `integrity` | `signerTrust` |
| --- | --- | --- |
| `validation_state: "Invalid"` | `'invalid'` | `'not-evaluated'` |
| `validation_state: "Valid"` | `'valid'` | `'not-evaluated'` |
| `validation_state: "Trusted"` | `'valid'` | `'trusted'` ← **MVP では到達しないが必ず実装する（D-030）** |
| `validation_state: null` | `'unknown'` | `'not-evaluated'` |

**`signingCredential.untrusted` を `'not-trusted'` にマップしないこと。**
Sourceglass が意図的にトラストリストを設定していないだけであり、
「この署名者は信頼できない」は言い過ぎになる。生のコードは詳細タブにだけ出す。

> **D-030 による明確化:** 「MVP では常に `'not-evaluated'`」と書いていたのは
> **`Valid` と `Invalid` の場合の話**であり、`Trusted` のマッピングを省く意味ではない。
> `Trusted` はトラストリストを設定して初めて発生するので MVP では到達しないが、
> **マッピングは今実装する。** 将来トラストリストを入れたときに
> `Trusted` が黙って `'not-evaluated'` に落ちる事故を防ぐため。

#### 帰結（ルールエンジンに直接効く）

> **`integrity === 'invalid'` の manifest から、AI シグナルを `basis: 'explicit'` として
> 採用してはいけない。**

改ざん検知に失敗した記録の中身は信頼できない。
該当する場合は `basis: 'heuristic'` に落とし、verdict とは独立した警告行
（`copy.md` の `integrity.invalid`）を併記する。

**テストに使えるフィクスチャは既にある:** スパイクで使用した
`adobe-20220124-E-uri-CA.jpg` が `c2pa.actions` のハッシュ不一致
（`assertion.hashedURI.mismatch`）のケース。

---

## 0. CodeX への基本ルール

1. **C2PA の API を推測で書かない。** Phase 0 で実物の出力を取得し、それに基づいて型を書く。
2. `any` 禁止。`tsconfig` は `strict: true` + `noUncheckedIndexedAccess: true`。
3. **`src/features/provenance/` から React / DOM / `window` に依存しない**（`File`/`Blob` は Web 標準として可）。
   将来 npm パッケージとして切り出せる状態を維持する。
4. 依存追加は本計画に列挙されたもののみ。追加が必要なら理由を添えて相談すること。
5. 各 Phase 完了時に `ai_tasks/context_snapshot.md` を更新する。
6. `git commit` / `git push` は実行しない。コミットメッセージ案の提示に留める。

---

## Phase 0 — 技術検証スパイク（0.5〜1人日）★ 最重要・省略禁止

**目的:** C2PA まわりの未確定事項を実測で潰す。ここで判明した事実に本実装を合わせる。

`spike/` ディレクトリ（後で削除）に最小の Vite アプリを作り、以下を確認して
`ai_tasks/20260804_sourceglass_mvp_design/spike_result.md` に**実際のログ・JSON を貼り付けて**記録する。

| # | 確認項目 | 記録すべきもの |
| --- | --- | --- |
| 1 | `?url` import した wasm が同一オリジンから読まれるか | DevTools Network のリクエスト一覧 |
| 2 | `reader.fromBlob()` → `manifestStore()` の**実際の JSON 全文** | 整形した JSON（C2PA 付きテスト画像で） |
| 3 | `digitalSourceType` がどのパスに現れるか | JSON 内のパス（例 `manifests[x].assertions[y].data.actions[z].digitalSourceType`） |
| 4 | validation state / validation results のフィールド名と取りうる値 | 型定義に写せるレベルで |
| 5 | **remote manifest fetch を無効化する設定の有無** | `createC2pa` の型定義・`node_modules` の d.ts を実際に読んで確認 |
| 6 | trust list 未設定時に validation state がどうなるか | 実際の値 |
| 7 | C2PA 無し画像 / 破損画像を渡した時の挙動（例外か null か） | エラーオブジェクトの形 |
| 8 | 解析中にメインスレッドが何 ms 止まるか | performance 計測値（500ms 超なら Worker 化を検討） |
| 9 | wasm を含む build 後の実サイズ | `dist/` のファイルサイズ一覧 |

**テスト画像:** `https://spec.c2pa.org/public-testfiles/` の公式テストファイルを使用。
リポジトリ同梱の可否はライセンスを確認し、不可なら取得スクリプト（`scripts/fetch-testdata.sh`）方式にする。

**Phase 0 の完了条件:** 上記9項目すべてに実測値が埋まっていること。「ドキュメントによると」は不可。

---

## Phase 1 — プロジェクト基盤（0.5人日）

```
sourceglass/
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── LICENSE                 # MIT
├── NOTICE                  # ExifReader (MPL-2.0) 等の帰属表示
├── README.md
├── public/
│   └── _headers            # Cloudflare Pages 用 CSP
├── e2e/
│   └── privacy.spec.ts     # Playwright: 外部通信0件の検証
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles/
    ├── i18n/
    ├── components/         # 汎用UI（Panel / Collapsible / Badge / Button）
    ├── features/
    │   ├── provenance/     # ★ 解析エンジン: UI非依存・将来npm化の境界
    │   │   ├── index.ts            # 公開API: inspectImage(input, opts)
    │   │   ├── types/index.ts
    │   │   ├── engine/
    │   │   │   ├── registry.ts     # ★ Detector 登録（v0.2 で1行足すだけにする）
    │   │   │   ├── runner.ts       # 並列実行・エラー隔離・coverage 集計
    │   │   │   └── input.ts        # AnalysisInput（bytes / pixels を遅延＋キャッシュ）
    │   │   ├── detectors/
    │   │   │   ├── c2pa/
    │   │   │   │   ├── detector.ts # Detector 実装
    │   │   │   │   ├── client.ts   # createC2pa 初期化・シングルトン管理
    │   │   │   │   ├── normalize.ts# manifestStore → 内部正規形
    │   │   │   │   └── rules.ts    # このソース固有のルール（型付き）
    │   │   │   ├── exif/{detector,parse,rules}.ts
    │   │   │   └── xmp/{detector,parse,rules}.ts
    │   │   ├── rules/
    │   │   │   ├── index.ts        # ★ 全ルールの集約点 + evaluate(): signals → verdict
    │   │   │   └── vocab.ts        # IPTC digitalSourceType 定数 / 既知AIツール名
    │   │   └── selectors.ts        # 型付きアクセサ（getC2pa(report) 等）
    │   └── inspector/      # UI（provenance に依存。逆方向の import は禁止）
    │       ├── DropZone.tsx
    │       ├── SummaryCard.tsx
    │       ├── Disclaimer.tsx
    │       ├── OptionalChecks.tsx  # ★ v0.2 の「追加チェック」を差し込む余白（v0.1 は空 or 非表示）
    │       └── details/{C2paDetails,ExifDetails,XmpDetails}.tsx
    ├── platform/
    │   └── pixels.browser.ts       # ★ canvas による画素デコード。DOM依存はここだけに閉じる
    └── utils/
```

`detectors/c2pa/` の内訳（Phase 0 の実測を反映）:

```
detectors/c2pa/
├── detector.ts     # Detector 実装。SDK の遅延 import はここ
├── client.ts       # createC2pa のシングルトン管理（await 必須・free() 必須）
├── settings.ts     # ★ 公開型に無い設定の局所的な型拡張はこのファイルだけ
├── normalize.ts    # manifestStore → C2paData（integrity / signerTrust を分離）
├── errors.ts       # 例外 → C2paErrorCode（message で verdict を判定しない）
└── rules.ts        # このソース固有のルール
```

依存パッケージ（これ以外を入れない）:

- dependencies: `react`, `react-dom`, `@contentauth/c2pa-web`, `exifreader`
- devDependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`,
  `@playwright/test`, `eslint` + `typescript-eslint`, `prettier`,
  **`@vitejs/plugin-basic-ssl`**（Phase 0 の D2 で追加承認。開発を HTTPS にするため）
- 型定義（承認済み。§依存ポリシーにより `@types/*` は個別承認不要）:
  `@types/react@19`, `@types/react-dom@19`, **`@types/node@24`**
- Phase 3 用に事前承認済み（D-021）: `eslint-plugin-react-hooks`

> **`@types/node` のメジャーは、実際に使う Node のメジャーに合わせること。**
> Phase 0 の実測環境は Node v24.13.0。**CI の Node も 24 に固定する。**
> ここがズレると型エラーが出たり出なかったりする再現性の低い状態になる。

`package.json` の scripts に以下を追加する（デザインガードは設計担当が用意済み）:

```json
"design:guard": "node scripts/design-guard.mjs",
"design:lock": "node scripts/design-guard.mjs --write"
```

### `.gitignore`（承認済み・この内容で作成する）

```gitignore
# 依存とビルド成果物
node_modules/
dist/

# テスト出力
playwright-report/
test-results/
coverage/

# 秘密情報（このリポジトリは public。事故を仕組みで止める）
.env
.env.*
*.pem

# OS
.DS_Store
```

**意図的に除外しないもの**（勝手に足さないこと）:

| パス | 理由 |
| --- | --- |
| `ai_tasks/` | 設計判断の記録を公開する方針 |
| `fixtures/` | フィクスチャはコミットする（`fixtures.md`） |
| `.vscode/` | 将来 `extensions.json` などを共有する可能性がある |

`.env` 系を入れているのは、**今使う予定が無くても事故で入りうるから**。
public リポジトリでは commit した時点で漏洩が確定する。
`*.pem` は、開発を HTTPS にしたことで手動生成の証明書が置かれる可能性があるため。

### CSP

`public/_headers` は **D2 の確定 CSP** を使う。`/*` に当てること
（Worker スクリプトのレスポンスにも CSP が乗る必要がある）。
`connect-src` を `'none'` にしないこと（WASM 本体の取得が止まる）。

---

## Phase 2 — 解析エンジン（2〜2.5人日）★ UI より先に完成させる

UI を一切書かずに、Vitest だけで完結させる。

### 2.0 先に境界を作る（Phase 1 レビューの決定・D-019 / D-020）

**エンジンを1行も書く前にこれをやる。** 後から入れると、既に混入した依存を剥がす作業になる。

`AGENTS.md` §2.1 の「解析エンジンは React / DOM に依存しない」は、
現状**規約でしか守られていない**。デザインを `design-guard` で守ったのと同じ考え方で、
機械的に落とせるようにする。**規約は破られるが、CI は破られない。**

**① eslint で import を禁止する**

```js
{
  files: ['src/features/provenance/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
          message: '解析エンジンは UI に依存しない（AGENTS.md §2.1）。' },
        { group: ['../../inspector/*', '**/features/inspector/*'],
          message: 'provenance → inspector の逆方向 import は禁止。' },
        { group: ['../../platform/*', '**/platform/*'],
          message: 'DOM 依存は注入する。platform を直接 import しない。' },
      ],
    }],
  },
}
```

**② Vitest の既定環境を `node` のままにする**

`features/provenance/` のテストは DOM が存在しない環境で走るので、
**DOM 依存が混入した瞬間にテストが落ちる。** ①と二重に境界を守れる。

- 既定環境を `jsdom` に変えない
- UI テストが必要になったら、そのファイルにだけ `// @vitest-environment jsdom` を書く
- Phase 1 の `App.test.tsx` が `renderToStaticMarkup` を使っているのはこの方針と整合している

**③ 境界が効いていることをテストする**

`features/provenance/` 配下に `import { useState } from 'react'` を書いた状態で
`npm run lint` が落ちることを一度手で確認し、確認したことを報告に含める
（デザインガードで同じ確認をしたのと同じ理由。**ガードは動作確認しないと飾りになる**）。

### 2.0.1 メタデータの上限とコンテナ走査（Phase 2 レビューの決定・D-022〜D-028）

実測: 13.3 MB の通常 JPEG は **0.1〜1.5 ms**、11.0 MB の巨大 XMP JPEG は **2,856〜3,765 ms**。
**遅いのはファイルサイズではなくメタデータ量。**

```
ExifReader を呼ぶ前に containerScan(bytes) を通す
  → セグメント一覧 + 合計メタデータバイト数
  → 上限超過なら ExifReader を呼ばない
```

`containerScan` は JPEG の APPn マーカー / PNG のチャンク / WebP の RIFF チャンクを
長さフィールドで飛ばしながら数えるだけ。マイクロ秒で終わる。
**`copy.md` §3.5 の「領域が無い」/「領域はあるが技術情報のみ」の出し分けにも同じ走査を使う。**

```ts
/** EXIF + XMP + IPTC の合計。C2PA は含まない（c2pa-web が自前 Worker で扱う） */
export const METADATA_BYTES_LIMIT = 262_144; // 256 KiB

export type MetadataErrorCode =
  | 'METADATA_TOO_LARGE'      // 上限超過。ExifReader を呼ばずに中止する
  | 'METADATA_READ_TIMEOUT'   // 定義のみ。Worker 実装を入れるまで発生しない
  | 'METADATA_PARSE_FAILED'
  | 'CONTAINER_UNREADABLE';
```

- セグメント走査ができないコンテナ（AVIF / HEIC）は、**ファイルサイズ 8 MiB** を粗い代替上限とする
- 上限超過は `SourceResult.error`（`METADATA_TOO_LARGE`）+ `coverage.failed` に `exif` と `xmp`
- **`emptyReason.noSegment` を出してはいけない。** 領域は存在した。読まなかっただけ

**`MetadataReader` ポート（D-025）**

```ts
// features/provenance/ports/metadataReader.ts
export interface MetadataReader {
  read(bytes: ArrayBuffer): Promise<RawMetadata>;
}
```

- v0.1 の実装は **inline**（ExifReader を直接呼ぶ）。`provenance/` 内に置くので CLI / npm 単体でも動く
- 将来 Worker 化するときは `platform/` に実装を足して runner へ注入する。**エンジン側の変更はゼロ**
- **`timeoutMs` を引数に入れない。** inline では同期処理を中断できず、受け取っても守れない。
  **守れない約束を型に書かない**

**自由記述値の切り詰め（D-027）**

- 1値あたり **512 文字**で切り詰め、`{ truncated: true, originalLength: n }` を持たせる
- 配列は最大 **50 要素**
- 切り詰めた事実を UI に出す（`copy.md` の `value.truncated`）。原文は保持しない

**Worker 化を再開する条件（D-024）**

> 上限ぎりぎり（メタデータ約 250 KB）の `xmp-large-within-limit.jpg` で
> **50 ms を超える停止が観測されたら、EXIF/XMP detector を Worker 化する。**
> 256 KiB という上限値は外挿なので、**実測して裏を取ること。**

### 2.1 型定義（`types/index.ts`）

```ts
export type Verdict =
  | 'AI_RELATED_PROVENANCE'
  | 'NO_AI_RELATED_PROVENANCE_FOUND'
  | 'NO_PROVENANCE_INFORMATION';

/** 「情報が無かった」と「解析に失敗した」を絶対に混同しないための型 */
export type SourceResult<T> =
  | { status: 'present'; data: T }
  | { status: 'absent' }
  | { status: 'error'; error: { code: string; message: string } }
  /** ★ D-029: 「調べていない」。absent（調べたが無かった）と絶対に混同しない */
  | { status: 'not-checked'; reason: 'unsupported' | 'not-requested' | 'unavailable' };

export type SignalCategory = 'ai-generation' | 'ai-editing' | 'provenance' | 'software';

/** explicit = 仕様上の正式な表明 / heuristic = ツール名等からの推定 */
export type SignalBasis = 'explicit' | 'heuristic';

export interface Signal {
  /** 例: 'c2pa.action.digitalSourceType.trainedAlgorithmicMedia' */
  id: string;
  source: 'c2pa' | 'exif' | 'xmp';
  category: SignalCategory;
  basis: SignalBasis;
  /** i18n キー。表示文字列をここに埋めない */
  labelKey: string;
  /** 何をもってそう判断したかの根拠。UI で必ず提示する */
  evidence: { path: string; value: string };
}

/** 解析対象。bytes と pixels を遅延供給する（画素デコードは重いのでキャッシュ必須） */
export interface AnalysisInput {
  readonly file: { name: string; size: number; mimeType: string };
  bytes(): Promise<ArrayBuffer>;
  /** v0.2 のウォーターマーク検出器が使う。v0.1 の検出器は呼ばない */
  pixels(opts?: { maxEdge?: number }): Promise<ImageData>;
}

/** ★ 検出器プラグイン。v0.2 では TrustMark 実装を1つ足して registry に登録するだけにする */
export interface Detector<T = unknown> {
  readonly id: string;                       // 'exif' | 'xmp' | 'c2pa' | 将来 'trustmark'
  readonly kind: 'metadata' | 'watermark';
  readonly needs: ReadonlyArray<'bytes' | 'pixels'>;
  /** 重いアセット（モデル等）の遅延ロードを伴うか。UI が「追加チェック」を出す判断に使う */
  readonly deferred?: boolean;
  supports(input: AnalysisInput): boolean;
  run(input: AnalysisInput): Promise<SourceResult<T>>;
}

/** ★ 何を検査したか。「検出されなかった」の意味は検査範囲に依存するため必須 */
export interface Coverage {
  ran: string[];
  skipped: Array<{ id: string; reason: 'unsupported' | 'not-requested' | 'unavailable' }>;
  failed: string[];
  /**
   * ★ 来歴として意味のある項目が1つでも見つかった detector。
   * 「領域そのものが無い」と「領域はあるが技術情報しか無い」を UI で区別するために必要。
   * Rule Engine の MEANINGFUL_FIELDS 判定を再利用するので追加コストはほぼゼロ。
   */
  withMeaningfulData: string[];
}

/**
 * 形式的な整合性（ハッシュ・署名の一致）。**信頼性の話ではない。**
 * c2pa-web の validation_state: "Valid" はここに対応する。
 */
export type IntegrityState = 'valid' | 'invalid' | 'unknown';

/**
 * 署名者の信頼性評価。
 * MVP ではトラストリストを意図的に設定しないため、常に 'not-evaluated' になる。
 * `signingCredential.untrusted` を 'not-trusted' にマップしないこと（言い過ぎになる）。
 */
export type SignerTrust = 'trusted' | 'not-trusted' | 'not-evaluated';

export interface C2paValidation {
  integrity: IntegrityState;
  signerTrust: SignerTrust;
  /** 生の validation_state。サマリーには出さず、詳細タブでのみ表示する */
  rawState: 'Valid' | 'Invalid' | 'Trusted' | null;
  /** validation_results.activeManifest.failure の生コード。詳細タブ用 */
  failures: ReadonlyArray<{ code: string; explanation: string | null }>;
}

export interface ProvenanceReport {
  file: { name: string; size: number; mimeType: string };
  /** detector id → 結果。型付きで取り出すには selectors.ts を使う */
  results: Readonly<Record<string, SourceResult<unknown>>>;
  coverage: Coverage;
  signals: Signal[];
  verdict: Verdict;
  /** verdict の根拠の強さ。AI_RELATED_PROVENANCE の時のみ意味を持つ */
  basis: SignalBasis | null;
  analyzedAt: string;
  engineVersion: string;
}
```

`C2paData` は **Phase 0 で得た実 JSON に基づいて**定義する。
`ProvenanceReport` と `AnalysisInput` の入出力は **structured-clone 可能**に保つこと（Worker 越しに渡すため）。

### 2.2 公開 API（`features/provenance/index.ts`）

```ts
export async function inspectImage(
  input: AnalysisInput,
  opts?: { only?: string[] },   // 特定 detector だけ実行（v0.2 の「追加チェック」用）
): Promise<ProvenanceReport>;
```

- registry の全 detector を **`Promise.allSettled` で並列実行**し、1つが落ちても他の結果を返す
- `deferred: true` の detector は **`opts.only` で明示指定された時だけ実行**する（v0.1 では該当なし）
- 例外を投げない。失敗は `SourceResult.error` に格納し `coverage.failed` に記録する
- `reader.free()` を `finally` で必ず呼ぶ
- **`File` を直接受け取らない。** `AnalysisInput` の生成は `platform/` 側の責務
  （＝Node/CLI では別実装を差せる）

### 2.2.1 実行戦略（Worker は v0.1 では作らない）

Phase 0 の D3 により、**v0.1 では全 detector をメインスレッドで実行する。**
c2pa-web が内部で Worker を持っており（実測: 停止 0.4 ms）、その上に自前 Worker を
重ねる意味がないため。

ただし将来 Worker 化するときに書き直しにならないよう、次を守る。

- `ProvenanceReport` と `AnalysisInput` の入出力は **structured-clone 可能**に保つ
- `features/provenance/` から DOM / `window` を触らない
- 実行の仕方を決めるのは `engine/runner.ts` のみ。**`Detector` は自分がどこで動くかを知らない**

v0.2 の ONNX 推論は、`runner` に「detector 単位の実行戦略」を足す形で対応する。

### 2.3 Rule Engine（`rules/`）

ルールは**宣言的テーブル**として書く。分岐を各パーサのコード中に散らさない。

配置方針: 各ルールテーブルは detector 直下（`detectors/*/rules.ts`）に置き、
**`rules/index.ts` がそれらを import して1つの配列に集約する。**
こうすると「全ルールを1箇所で見渡せる」要件を満たしつつ、各ルールが自分の detector の
出力型で型付けされる（`unknown` へのキャストが不要になる）。v0.2 の TrustMark も同じ形で足す。

```ts
interface Rule {
  id: string;
  source: 'c2pa' | 'exif' | 'xmp';
  category: SignalCategory;
  basis: SignalBasis;
  labelKey: string;
  /** 該当すれば根拠を返す。しなければ空配列 */
  match(input: NormalizedInput): Array<{ path: string; value: string }>;
}

export const RULES: readonly Rule[] = [ /* ... */ ];
```

MVP に入れるルール:

| id | source | basis | 内容 |
| --- | --- | --- | --- |
| `c2pa.dst.trainedAlgorithmicMedia` | c2pa | explicit | actions の digitalSourceType が `trainedAlgorithmicMedia` |
| `c2pa.dst.compositeWithTrainedAlgorithmicMedia` | c2pa | explicit | 同上（合成） |
| `c2pa.iptc.digitalSourceType` | c2pa | explicit | `stds.iptc.photo-metadata` の DigitalSourceType が AI 語彙 |
| `xmp.iptc.digitalSourceType` | xmp | explicit | `Iptc4xmpExt:DigitalSourceType` が AI 語彙 |
| `exif.software.aiTool` | exif | heuristic | `Software` が既知の生成AIツール名リストに一致 |
| `xmp.creatorTool.aiTool` | xmp | heuristic | `xmp:CreatorTool` が同上 |

- `algorithmicMedia`（非AIのアルゴリズム生成）を **AI 判定に含めない**こと。誤判定の主要因。
- **C2PA 由来のルールは `integrity === 'valid'` のときだけ `basis: 'explicit'` を返す。**
  `'invalid'` のときは `'heuristic'` に落とす（D6）。改ざん検知に失敗した記録の中身は信頼できない。
- `manifests` は配列ではなく label をキーにした object。
  **すべての manifest の assertions を走査する**（`active_manifest` だけを見ない）。
- 既知 AI ツール名リストは `vocab.ts` に定数として置き、**完全一致 or 明確な前方一致のみ**。
  部分一致による誤検知を避ける（例: "Adobe Photoshop" 単体は AI 扱いしない）。

`evaluate()` の判定順序:

```
1. signals に category が 'ai-generation' | 'ai-editing' のものがある
     → AI_RELATED_PROVENANCE
       basis = explicit が1つでもあれば 'explicit'、なければ 'heuristic'
2. いずれかの source が 'present' かつ「意味のある来歴フィールド」を1つ以上含む
     → NO_AI_RELATED_PROVENANCE_FOUND
3. それ以外（全て absent、または解像度・色空間のような無意味な EXIF のみ）
     → NO_PROVENANCE_INFORMATION
```

「意味のある来歴フィールド」は `MEANINGFUL_FIELDS` 定数（allowlist）で定義:
`Software`, `CreatorTool`, `DateTimeOriginal`, `CreateDate`, `Artist`, `Creator`,
`Copyright`, `Make`, `Model`, XMP History, C2PA マニフェストの存在。

> ⚠️ ここを雑にすると、色空間しか入っていない JPEG が
> 「来歴情報あり・AI検出なし」と表示され、ユーザーに誤った安心を与える。最も注意すべき箇所。

### 2.4 テスト（Vitest）

**フィクスチャは [`fixtures.md`](./fixtures.md) の一覧に従い、Phase 2 の着手前に揃えること。**
フィクスチャ無しでエンジンを書くと、判定ロジックが実物と乖離する。

- 3 verdict すべてに対応する実画像でのテスト
- **`c2pa-algorithmic`（非AIのアルゴリズム生成）を AI 判定しない回帰テスト**
- **`exif-technical-only` と `no-metadata` の出し分け**（`coverage.withMeaningfulData`）
- `c2pa-multi-action`（actions 配列の末尾に AI）で走査漏れが無いこと
- 破損ファイル / 0バイト / 非画像ファイルで例外を投げず `coverage.failed` に載ること
- rules の各ルールに対する単体テスト（正例・負例）
- **実物の AI 生成画像（`fixtures/real/`）は verdict を厳密に固定しない**
  （上流サービスの出力変更で CI が壊れるため、構造のスナップショット確認に留める）

**Phase 0 の決定に対応する追加テスト（Phase 2 の完了条件）:**

- **remote-only fixture で外部リクエストが 0 件**であること（D1）
  → `https://example.invalid/...` を `dcterms:provenance` に持つ JPEG を作り、e2e で検証
- `adobe-20220124-E-uri-CA.jpg`（ハッシュ不一致）で
  **`integrity === 'invalid'` になり、C2PA 由来シグナルが `explicit` にならない**こと（D6）
- 公式テストファイルで **`signerTrust === 'not-evaluated'`** になること（`'not-trusted'` にしない）
- C2PA 無し → `absent` / 破損 → `error` / 0バイト → `error` が**別経路として区別される**こと（D5）
- **ExifReader のメインスレッド停止時間を 10MB 以上のファイルで測定する**（D3 の積み残し）
  → 50ms を超えるなら EXIF/XMP detector の Worker 化を設計担当に相談する

**Phase 2 完了条件:** UI が1行も無い状態で、Node/Vitest 上から `inspectImage()` が
3種の verdict を正しく返すこと。

---

## Phase 3 — UI（1.5人日）

トップ:

```
Sourceglass
Inspect the provenance of an image.

┌─────────────────────────────┐
│   Drop an image here        │
│         or                  │
│     [ Select Image ]        │
└─────────────────────────────┘
```

結果画面:

1. **Summary**（C2PA / AI-related provenance / Software / EXIF / XMP の Detected 表示）
2. **Result** — verdict に対応する1文
3. **Disclaimer** — Result の**直下**に常時表示（折りたたみ不可）
4. **Details** — C2PA / EXIF / XMP を `<details>` で折りたたみ

文言の鉄則:

| verdict | 表示（EN） |
| --- | --- |
| AI_RELATED_PROVENANCE (explicit) | ⚠ AI-related provenance was detected in the C2PA data. |
| AI_RELATED_PROVENANCE (heuristic) | ⚠ Metadata mentions an AI tool, but this is not verified by C2PA. |
| NO_AI_RELATED_PROVENANCE_FOUND | ✓ No AI-related provenance was detected. |
| NO_PROVENANCE_INFORMATION | ⓘ No usable provenance information was found. This does not mean AI was not used. |

**`coverage` を必ず UI に出す。** 「検出されなかった」は検査範囲に依存するため、
`Checked: EXIF, XMP, C2PA` のように**何を調べた結果なのか**を明示する。
v0.2 で検査対象が増えたときに、この表示がそのまま意味を持つ。

**文言は [`copy.md`](./copy.md) の確定版をそのまま使う。勝手に言い換えない。**
特に以下は仕様なので必ず守ること。

- `✓` と緑を使わない。色を使うのは AI 関連が見つかった場合だけ
- `NO_PROVENANCE_INFORMATION` は**破線**ボーダー、`NO_AI_RELATED_PROVENANCE_FOUND` は**実線**
  （この2つの混同が最大のリスクなので、記号・文言だけでなく形でも差をつける）
- Summary の空欄は空白にせず `—` で埋める（空白は「調べていない」に見える）
- `NO_PROVENANCE_INFORMATION` では `coverage.withMeaningfulData` を使い、
  「領域が無い」/「領域はあるが技術情報のみ」を出し分ける（`copy.md` §3.5）
- 「メタデータが失われる主な場面」の折りたたみを併置する

**`OptionalChecks.tsx` の余白を用意する。** v0.1 では `deferred` な detector が無いので
何も描画しないが、Summary と Details の間に差し込み位置だけ確保しておく
（v0.2 の「Watermark check — Downloads a ~XX MB model. Runs locally. [Run check]」が入る場所）。

免責（常時表示）:

> The absence of AI-related provenance does not prove that an image was not generated or edited using AI.
> AI生成を示す来歴情報が検出されなかったことは、この画像が AI によって生成・編集されていないことを保証するものではありません。

- 「✓」を緑にしすぎない（安全のお墨付きに見える配色を避ける）
- 各シグナルには必ず `evidence.path` を併記し、**どのフィールドを根拠にしたか**を見せる
- 実装制約: 解析は `URL.createObjectURL` / `FileReader` のみ。`fetch` を UI から呼ばない

---

## Phase 4 — i18n（0.5人日）

`src/i18n/{en,ja,index}.ts` の辞書オブジェクト方式。ライブラリ不使用。

```ts
export const en = { /* ... */ } as const;
export type TranslationKey = keyof typeof en;
export const ja: Record<TranslationKey, string> = { /* ... */ };
```

`ja` を `Record<TranslationKey, string>` にすることで**翻訳漏れを型エラーにする**。
初期言語は `navigator.language`、選択は `localStorage` に保存。

---

## Phase 5 — ドキュメント / OSS 整備（0.5人日）

**README 構成**

1. ヘッダー（`task.md` §13 のメッセージをそのまま冒頭に）
2. What Sourceglass is / **What Sourceglass is NOT**（AI Detector ではない）
3. Privacy — No uploads / No AI APIs / No accounts / No server
4. **Verifiable privacy** — CSP と Playwright による無通信検証をどう担保しているか
5. Supported formats / Supported provenance
6. How the AI-related judgement works（IPTC digitalSourceType の表を載せる）
7. Tech stack / Development / Build
8. **Known limitations**（`task.md` §5）
9. License — MIT。**ExifReader が MPL-2.0 である旨と NOTICE への参照**

`LICENSE`(MIT) と `NOTICE`（`@contentauth/c2pa-web`: MIT / `exifreader`: MPL-2.0）を作成。

---

## Phase 6 — プライバシー検証とデプロイ（0.5人日）★ このプロジェクトの目玉

`e2e/privacy.spec.ts`:

```ts
// 解析フロー全体で発生したリクエストを記録し、同一オリジン以外が 0 件であることを検証
const requests: string[] = [];
page.on('request', (r) => requests.push(r.url()));
// ... 画像を投入して解析完了まで待つ ...
expect(requests.filter((u) => new URL(u).origin !== baseOrigin)).toEqual([]);
```

さらに CI で:

- `dist/` 内に外部オリジン URL 参照が無いこと（grep）
- `tsc --noEmit` / `eslint` / `vitest run` / `playwright test`

デプロイ: Cloudflare Pages（`public/_headers` で CSP）。
GitHub Pages にも置ける構成にする（その場合 CSP は `<meta>` タグにフォールバック）。

---

## スコープ外（MVP では実装しない）

複数画像一括 / CSV・JSON エクスポート / Content Credentials ビジュアライゼーション /
ウォーターマーク検証 / PWA / CLI / npm パッケージ公開 / トラストリスト評価 / URL からの読み込み。

ただし **すべて `features/provenance/` の外側に足せる**設計を維持すること。

---

## 全体の受け入れ基準

- [ ] 解析中の外部オリジンへのリクエストが 0 件（Playwright で自動検証）
- [ ] `dist/` に外部 URL 参照が無い
- [ ] 確率表示・AI 断定表現がコード・文言のどこにも存在しない
- [ ] 免責文言が結果の直下に常時表示され、折りたためない
- [ ] 3 verdict すべてに実画像テストがある
- [ ] `algorithmicMedia` を AI と誤判定しない
- [ ] `features/provenance/` が React / DOM API に依存していない（canvas は `platform/` のみ）
- [ ] Detector を1つ追加するのに `registry.ts` への1行 + 新規ディレクトリだけで済む
- [ ] `coverage`（検査した項目）が UI に表示されている
- [ ] `ProvenanceReport` が structured-clone 可能（Worker 化はしないが制約は維持する）
- [ ] `integrity` と `signerTrust` が別フィールドで、`Valid` を trust の根拠にしていない
- [ ] `integrity === 'invalid'` のとき C2PA 由来シグナルが `explicit` にならない
- [ ] remote-only fixture で外部リクエストが 0 件
- [ ] CSP が1本（開発・本番で同一）で、`worker-src` に `blob:` が入っていない
- [ ] e2e がビルド成果物 + 本番ヘッダに対して実行されている
- [ ] トップ画面の初期ロードに C2PA の WASM が含まれていない（遅延ロードされている）
- [ ] `any` が 0 個 / `tsc --noEmit` と eslint がクリーン
- [ ] README に Known limitations と MPL-2.0 の記載がある
