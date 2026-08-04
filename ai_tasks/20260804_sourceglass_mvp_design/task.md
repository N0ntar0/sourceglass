# Last Updated: 2026-08-04 21:30

# Sourceglass — 要件整理 / 技術調査 / 技術選定

設計責任者: Claude / 実装担当: CodeX

---

## 1. プロダクト定義

**Sourceglass — Open-source image provenance inspector**

画像ファイルに *実際に記録されている* 来歴情報（C2PA / EXIF / XMP）をブラウザ内だけで解析し、
事実ベースで提示するツール。

**これは AI 判定器ではない。** 画像の内容から推測する処理は一切実装しない。

### 絶対に守る禁止事項

| 禁止 | 理由 |
| --- | --- |
| 「AI probability: 87%」等の確率表示 | 推測を事実として提示することになる |
| 「AI生成ではありません」という断定 | 来歴情報の不在は不使用の証明ではない |
| 画像・メタデータの外部送信 | Privacy First の根幹 |
| LLM API / AI検出 API の利用 | 同上、かつプロダクト定義に反する |
| サーバー / DB / アカウント | 静的ホスティングで完結させる |

---

## 2. 調査結果（2026-08-04 時点・実データで確認済み）

### 2.1 C2PA

| 項目 | 内容 |
| --- | --- |
| 採用ライブラリ | `@contentauth/c2pa-web` **v0.13.1** |
| ライセンス | **MIT** |
| 最終公開 | 2026-07-28 |
| 依存 | `@contentauth/c2pa-wasm`, `@contentauth/c2pa-types`, `ts-deepmerge`, `highgain` |

**重要な前提の訂正:** 元プロンプトが参照していた `c2pa` npm パッケージは **deprecated**。
旧リポジトリは `contentauth/c2pa-js-legacy` へ退避され、2026年6月に現行 `contentauth/c2pa-js`
モノレポへ統合済み。**必ず `@contentauth/c2pa-web` を使うこと。**

確認済み API:

```ts
import { createC2pa } from '@contentauth/c2pa-web';
import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

const c2pa = createC2pa({ wasmSrc });
const reader = await c2pa.reader.fromBlob(blob.type, blob);
const manifestStore = await reader.manifestStore();
reader.free();   // ← 明示的な解放が必要（WASM メモリリーク防止）
```

- `?url` import により **wasm は Vite が同一オリジンに同梱する**（CDN 不要）→ 要件8を満たす
- inline 版（`@contentauth/c2pa-web/inline`）は base64 埋め込みでネットワーク要求ゼロだが
  バンドルが大幅に肥大するため MVP では不採用（→ 将来オプション）

**未確定（Phase 0 のスパイクで実物を確認すること・推測実装禁止）:**

1. `createC2pa()` の settings で **remote manifest fetch を無効化できるか**
   （c2pa-rs には `verify.remote_manifest_fetch` 設定が存在。ブラウザ版での指定方法が未確認）
2. trust list / trust anchor の扱い。MVP では**トラスト評価を行わない**方針とし、
   UI では「署名の形式的な検証」と「発行者の信頼性評価」を明確に区別して表示する
3. `manifestStore()` / validation state の実際の JSON 構造とフィールド名
4. Web Worker 利用の有無（ドキュメントに記載なし。メインスレッドを塞ぐならワーカー化を検討）

### 2.2 EXIF / XMP

| ライブラリ | License | 最終更新 | 判定 |
| --- | --- | --- | --- |
| exifr 7.1.3 | MIT | **2021-08** | ✕ 5年更新停止・WebP 非対応 |
| **ExifReader 4.41.3** | **MPL-2.0** | 2026-07-18 | ◎ **採用** |

ExifReader 採用理由:

- JPEG / PNG / WebP / AVIF / HEIC / TIFF / GIF に対応（初期対応形式 + 拡張形式をカバー）
- EXIF / XMP / IPTC / ICC を単体で解析（**XMP 用に別パーサ不要 → 依存を増やさずに済む**）
- ランタイム依存ゼロ
- ビルドカスタマイズで不要モジュールを削れる

**ライセンス上の注意（README に明記すること）:**
MPL-2.0 はファイル単位の弱いコピーレフト。**無改変で依存する限り MIT 本体と両立する。**
ExifReader のソースを改変して同梱する場合はその改変ファイルが MPL-2.0 のままになるため、
**フォーク・改変はしない**方針とする。

`fast-xml-parser` は推移的依存が6個あるため MVP では採用しない（XMP は ExifReader に任せ、
生 XMP パケットの表示は自前抽出で対応）。

### 2.3 AI 関連来歴の判定根拠（仕様ベース・文字列 grep ではない）

**C2PA（一次根拠 / explicit）**

- `c2pa.actions` および `c2pa.actions.v2` アサーション内の各 action の **`digitalSourceType`** フィールド
- IPTC NewsCodes 語彙（`http://cv.iptc.org/newscodes/digitalsourcetype/...`）:

| 値 | 意味 | 扱い |
| --- | --- | --- |
| `trainedAlgorithmicMedia` | 生成AIによる作成 | **AI生成** |
| `compositeWithTrainedAlgorithmicMedia` | 生成AI要素を含む合成 | **AI編集/合成** |
| `algorithmicMedia` | アルゴリズム生成（非AI・CG等） | **AI扱いしない** ← 誤判定注意 |
| `digitalCapture` 等 | 撮影 | AI関連なし |

- `stds.iptc.photo-metadata` アサーション内の `DigitalSourceType`
- action label 自体（`c2pa.created` / `c2pa.edited` / `c2pa.placed`）は AI か否かを示さない。
  **必ず digitalSourceType と組で判定すること。**

**XMP（一次根拠 / explicit）**

- `Iptc4xmpExt:DigitalSourceType` — 上記と同じ IPTC 語彙

**EXIF / XMP のツール名（二次根拠 / heuristic）**

- `Software` / `xmp:CreatorTool` に生成AIツール名が記録されているケース
- これは**仕様上の正式な AI 表明ではない**ため、explicit と明確に区別して扱う（§3.3 参照）

---

## 3. 決定事項

### 3.1 技術構成

| 領域 | 採用 | 備考 |
| --- | --- | --- |
| ビルド | **Vite** | wasm の `?url` 同梱、静的出力 |
| 言語 | **TypeScript**（`strict: true`, `any` 禁止） | |
| UI | **React 19 + TypeScript** | |
| C2PA | `@contentauth/c2pa-web` (MIT) | |
| EXIF/XMP | `exifreader` (MPL-2.0) | |
| スタイル | **プレーン CSS（CSS Modules or 単一 CSS + カスタムプロパティ）** | UI ライブラリは入れない |
| i18n | **自前の軽量辞書オブジェクト** | i18n ライブラリは入れない |
| テスト | **Vitest**（エンジン） + **Playwright**（プライバシー検証） | |
| ホスティング | **Cloudflare Pages**（`_headers` で CSP） | GitHub Pages でも動く構成にする |
| ライセンス | **MIT** | ExifReader の MPL-2.0 を NOTICE に明記 |

### 3.2 Hono は今回採用しない（判断と根拠）

Sourceglass は本質的にサーバーが不要なため、Hono に実用的な役割がない。

- CSP ヘッダ付与は `public/_headers` で足りる → Hono を入れる理由にならない
- `hono/jsx/dom` を React 代替にする案は軽量化の実利はあるが、Hono の本体機能に触れない上、
  OSS のコントリビューター獲得では React が有利

**ただし将来 Hono が本当に必要になるポイントを2つ想定し、設計で手当てする:**

1. **URL から画像を読む機能** — CORS によりブラウザ単体では不可能。Workers 上のプロキシが必須
2. **解析エンジンの API 版**（CI / bot 向け `POST /inspect`）

→ **対策: 解析エンジンを「File を入れると Report が返る純粋な関数」として UI から完全分離する。**
後日 Hono + Workers の 50行程度のラッパーで API 版にできる状態を保つ。

### 3.3 explicit / heuristic の分離（本設計の要）

元要件の「単純な文字列検索だけではなく仕様上の意味に基づいて判定」を実装に落とすため、
検出シグナルに `basis` を持たせる。

| basis | 例 | verdict への影響 | UI 表現 |
| --- | --- | --- | --- |
| `explicit` | C2PA `digitalSourceType: trainedAlgorithmicMedia` | AI_RELATED_PROVENANCE | 「C2PA に AI 生成を示す正式な来歴情報があります」 |
| `heuristic` | EXIF `Software: <生成AIツール名>` | AI_RELATED_PROVENANCE（ただし basis を併記） | 「メタデータに AI ツールを示す記述がありますが、C2PA による検証はされていません」 |

verdict の種類は要件どおり3つのまま増やさない。**強さの違いは verdict ではなく `basis` で表現する。**

### 3.4 プロジェクト名（当初案「TraceLens」から改名）

当初仮称の **TraceLens は使わない**。調査の結果、衝突が深かったため。

- npm `tracelens` / `@tracelens/*` スコープが取得済み → **解析エンジンの npm 分離が塞がれる**
- `AMD-AGI/TraceLens`（AMD 公式の性能解析ツール）、`tracelens.io`（OpenTelemetry ビジュアライザ）
- 同名の学術論文2件、Google Play に同名アプリ
- → 実害は「検索で埋もれる」「npm 名が取れない」の2点。コード0行の今なら改名コストがゼロ

**採用: Sourceglass**（npm / GitHub / .dev・.app・.io すべて空きを実測確認済み）

命名規約として、**以下の語は製品名・機能名・UI 文言のどこにも使わない。**
免責文言と正面から矛盾するため。

> ✕ `Proof` / `Verify` / `Authentic` / `Detect`（AI検出の意味で）/ `Proven`

（`Provenlens` `Provenscope` を候補から落としたのはこの理由 — "Proven" と誤読されるため）

`Source` は C2PA の中核フィールド `digitalSourceType` と響き合い、
`-glass`（looking glass）は「見せるだけで判定しない」という態度と一致する。

### 3.5 UI 言語

**英語 + 日本語切替**（軽量な辞書オブジェクト方式、`localStorage` に保存、既定はブラウザ言語）。
免責文言は両言語で正確に用意する。

---

## 4. ブラウザ完結の検証方針（要件2の担保）

「送信していない」を主張ではなく**検証可能な事実**にする。

1. `dist/` 内に外部オリジンの URL 参照が存在しないことを grep で検査（CI）
2. Playwright で解析フロー全体を実行し、**発生した全ネットワークリクエストを記録 →
   同一オリジン以外が 0 件であることをアサート**（CI）
3. CSP を配信ヘッダで強制:
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval';
     style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:;
     connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'
   ```
   - `'wasm-unsafe-eval'` は WASM 実行に必要
   - `connect-src` は `'self'`。**`'none'` にすると wasm 本体の fetch も止まる**ため不可。
     `'none'` を実現したい場合は inline wasm 版が必要（将来オプション）

---

## 5. Known limitations（README に必ず記載）

- 来歴情報の不在は AI 不使用を意味しない
- メタデータは容易に除去・改変・偽装できる（SNS 投稿時のリサイズで大半が消える）
- MVP では **C2PA 署名者のトラストリスト評価を行わない**（署名の形式的検証のみ）
- リモートマニフェスト（クラウド保管の C2PA）は取得しない = 検出できない
- 対応形式は JPEG / PNG / WebP（+ ExifReader の対応範囲で AVIF / HEIC も試験的に）
