# Last Updated: 2026-08-04 23:40

# Sourceglass テストフィクスチャ仕様

`fixtures/` 配下に配置。**Phase 2（解析エンジン）の着手前に揃えること。**
フィクスチャが無いままエンジンを書くと、判定ロジックが実物と乖離する。

---

## 0. 大前提: フィクスチャはリサイズ・再保存できない

**リサイズ = 再エンコード = テストしたいメタデータの消滅。** 後から縮めることは不可能。
git に大きなバイナリを入れたくないなら、**最初から小さいサイズ（長辺 512px 程度）で生成する。**

実物の AI 生成画像も、生成時に小さいサイズを指定すること。

---

## 1. 3つの調達ルート

| ルート | 用途 | ライセンス |
| --- | --- | --- |
| **A. C2PA 公式テストファイル** (`spec.c2pa.org/public-testfiles/`) | 仕様準拠の基準データ | **CC BY-SA** |
| **B. c2patool で自前生成** | AI 関連・エッジケース・回帰テスト | 完全にクリーン（自作） |
| **C. 実物の生成AI画像** | 実ツールの出力構造の確認 | 各サービスの利用規約に従う |

### ルート A の注意

- **改変すると CC BY-SA が適用される。リサイズも切り抜きもせず、原本のまま同梱する**
- `NOTICE` に出典とライセンスを明記する
- コードではなくデータなので MIT 本体と両立する

### ルート B が決め手になる理由

公式テストファイルには **AI 関連（`trainedAlgorithmicMedia`）のサンプルが無い。**
さらに `algorithmicMedia`（非AI のアルゴリズム生成。**誤判定の主要因**）のサンプルは
実世界からは事実上入手できない。

→ `c2patool`（c2pa-rs の CLI）で、任意の `digitalSourceType` を持つ署名済み画像を自作する。
c2pa-rs にテスト用証明書が同梱されているので追加調達は不要。

**副次効果:** テスト証明書で署名した画像は「信頼されない署名者」になるため、
MVP の「トラスト評価はしない」表示パスもそのままテストできる。

### ルート C の注意

- **回帰テストの基準にしない。** 実サービスは予告なく出力構造を変えるので CI が壊れる
- `fixtures/real/` に隔離し、**構造確認用のスナップショット**として扱う
- 生成プロンプトは抽象的なもの（幾何模様など）にする。人物・ブランド・著名キャラを避ける
- 入手可能なもの: **OpenAI（DALL·E / GPT Image / Sora）/ Adobe Firefly / Google Gemini・Imagen**
- Midjourney は 2026年初頭時点で C2PA 非対応のため対象外

---

## 2. フィクスチャ一覧

`fixtures/` 直下。ファイル名は id をそのまま使う。

### C2PA あり

| id | 内容 | 期待 verdict / basis | 調達 |
| --- | --- | --- | --- |
| `c2pa-ai-trained` | actions に `trainedAlgorithmicMedia` | AI_RELATED / explicit | B |
| `c2pa-ai-composite` | `compositeWithTrainedAlgorithmicMedia` | AI_RELATED / explicit | B |
| **`c2pa-algorithmic`** | **`algorithmicMedia`（非AI）** | **NO_AI_FOUND** ★回帰テスト | B |
| `c2pa-capture` | `digitalCapture` | NO_AI_FOUND | A + B |
| `c2pa-multi-action` | actions 配列に複数要素、AI は末尾 | AI_RELATED / explicit ★走査漏れ検出 | B |
| `c2pa-iptc-assertion` | `stds.iptc.photo-metadata` 側に DigitalSourceType | AI_RELATED / explicit | B |
| `c2pa-real-openai` | OpenAI の実出力 | 構造確認用 | C |
| `c2pa-real-firefly` | Firefly の実出力 | 構造確認用 | C |
| `c2pa-real-gemini` | Gemini / Imagen の実出力 | 構造確認用 | C |

### C2PA なし

| id | 内容 | 期待 verdict / basis | 調達 |
| --- | --- | --- | --- |
| `xmp-ai-dst` | XMP の `Iptc4xmpExt:DigitalSourceType` が AI 語彙 | AI_RELATED / explicit | exiftool で自作 |
| `exif-software-aitool` | EXIF `Software` に生成AIツール名 | AI_RELATED / **heuristic** | exiftool で自作 |
| `exif-rich-no-c2pa` | Software / DateTimeOriginal / Artist 等が充実 | NO_AI_FOUND | スマホ写真 or 編集ソフトの書き出し |
| **`exif-technical-only`** | **色空間・寸法のみの EXIF** | **NO_PROVENANCE** ★最重要 | 再エンコードで生成 |
| `no-metadata` | メタデータ領域そのものが無い | NO_PROVENANCE | 再エンコード / スクショ |

> `exif-technical-only` と `no-metadata` は、`copy.md` §3.5 の
> 「領域が無い」/「領域はあるが技術情報のみ」の**出し分けを検証する唯一の手段**。必ず両方作る。

### 形式カバレッジ

| id | 内容 |
| --- | --- |
| `png-exif` / `png-xmp` / `png-c2pa` | PNG での各メタデータ |
| `webp-exif` / `webp-xmp` / `webp-c2pa` | WebP での各メタデータ |
| `avif-exif` | AVIF（試験的対応の確認） |

### 異常系（例外を投げずに `SourceResult.error` を返すこと）

| id | 内容 |
| --- | --- |
| `broken-truncated` | 途中で切ったファイル |
| `broken-not-image` | テキストファイルを `.jpg` にリネーム |
| `broken-zero-byte` | 0 バイト |
| `broken-huge-exif` | 異常に大きい EXIF（DoS 耐性） |

---

## 3. 生成手順

`scripts/build-fixtures.sh` として**再現可能な形でスクリプト化**する。
手作業で作って置くだけにしないこと（作り直せなくなる）。

必要な開発ツール（**アプリの依存には含めない。開発時のみ**）:

- `c2patool` — C2PA 署名済みフィクスチャの生成
- `exiftool` — EXIF / XMP の埋め込み・書き換え
- `ffmpeg` or `sharp` — メタデータを落とした再エンコード

ベース画像は自前で作る（単色や幾何模様で十分）。権利問題をゼロにできる。

---

## 4. テストでの使い分け

| 種別 | テスト方法 |
| --- | --- |
| ルート A / B のフィクスチャ | **verdict と signals を厳密にアサート**（決定的なので CI の基準にできる） |
| ルート C（実物） | 構造のスナップショット確認のみ。**verdict を厳密に固定しない**（上流の変更で壊れるため） |
| 異常系 | 例外を投げないこと・`coverage.failed` に記録されることをアサート |

---

## 5. NOTICE への記載（忘れやすい）

- C2PA 公式テストファイル: 出典 URL + **CC BY-SA** + 無改変で再配布している旨
- 実物の AI 生成画像: 生成に使ったサービス名と、テスト目的での利用である旨
