# Last Updated: 2026-08-04 21:30

# Sourceglass MVP 実装計画（CodeX 向け作業指示書）

前提: [`task.md`](./task.md) の調査結果・決定事項と [`roadmap.md`](./roadmap.md) を必ず先に読むこと。

想定工数: **合計 6〜7.5 人日**（Phase 0 を飛ばさないこと）

> **v0.2（TrustMark = 画素層のウォーターマーク検出）が確定しているため、
> v0.1 の時点で 4 つの抽象を先に入れる。** 詳細は [`roadmap.md`](./roadmap.md)。
>
> 1. **Detector レジストリ** — 固定の `c2pa/exif/xmp` フィールドをやめ、登録制にする
> 2. **`AnalysisInput`** — 「バイト列」と「画素」を遅延・分離して供給する
> 3. **`coverage`** — 何を検査したかを Report に持たせる（免責文言の強さを連動させる）
> 4. **Web Worker 上で実行** — ONNX 推論は秒単位でメインスレッドを止めるため

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
    ├── workers/
    │   └── inspect.worker.ts       # ★ エンジンを Worker 上で実行する薄いラッパ
    └── utils/
```

依存パッケージ（これ以外を入れない）:

- dependencies: `react`, `react-dom`, `@contentauth/c2pa-web`, `exifreader`
- devDependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`,
  `@playwright/test`, `eslint` + `typescript-eslint`, `prettier`

`public/_headers`（内容は `task.md` §4 の CSP をそのまま使う。`connect-src 'self'` を `'none'` にしないこと）

---

## Phase 2 — 解析エンジン（2〜2.5人日）★ UI より先に完成させる

UI を一切書かずに、Vitest だけで完結させる。

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
  | { status: 'error'; error: { code: string; message: string } };

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

### 2.2.1 Worker 化

`src/workers/inspect.worker.ts` がエンジンを呼び、UI は postMessage 経由で結果を受け取る。

- `pixels()` は Worker 内では `OffscreenCanvas` / `createImageBitmap` を使う実装に差し替える
- Worker が使えない環境ではメインスレッド実行にフォールバックする
- Phase 0 の #8（メインスレッド blocking 計測）の結果次第だが、**v0.2 の ONNX 推論で
  必ず必要になるため v0.1 から入れる**

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
- [ ] エンジンが Worker 上で動き、`ProvenanceReport` が structured-clone 可能
- [ ] `any` が 0 個 / `tsc --noEmit` と eslint がクリーン
- [ ] README に Known limitations と MPL-2.0 の記載がある
