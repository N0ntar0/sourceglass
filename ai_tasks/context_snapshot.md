# Last Updated: 2026-08-04 23:50

## Current Topic

Sourceglass — Open-source image provenance inspector の MVP 設計
参照フォルダ: `ai_tasks/20260804_sourceglass_mvp_design/`

- `task.md` — 要件整理・技術調査結果・技術選定と根拠
- `implementation_plan.md` — CodeX 向け Phase 0〜6 の作業指示書
- `roadmap.md` — v0.1 / v0.2(TrustMark) / v0.3(未確定) / 将来(SynthID) の方針
- `copy.md` — UI 文言の確定版（i18n 辞書。CodeX は言い換え禁止）
- `fixtures.md` — テストフィクスチャ仕様
- `design.md` — ビジュアル仕様（トークン・反転・タイポ・アイコン）
  参照実装: https://claude.ai/code/artifact/afe097e6-a8b6-4093-8ef7-82626ca527fa

役割分担: 設計 = Claude / 実装 = CodeX
`ai_tasks/` は **gitignore せずコミットする**方針（設計判断の記録を OSS の信頼材料にする）

## Last Actions

- **プロジェクト名を TraceLens → Sourceglass に改名**
  - npm `tracelens` 取得済み / `AMD-AGI/TraceLens`(AMD公式) / `tracelens.io` / 同名論文2件と衝突
  - Sourceglass は npm・GitHub・.dev/.app/.io すべて空きを実測確認
  - 命名規約: `Proof` `Verify` `Authentic` `Proven` `Detect` を製品名・UI 文言で使わない
  - ドキュメント表記とトピックフォルダ名は反映済み。**リポジトリのディレクトリ名は未変更**
- 技術調査を実データで完了
  - `c2pa` npm は **deprecated** → `@contentauth/c2pa-web` v0.13.1 (MIT) を採用
  - EXIF/XMP は exifr（2021年で更新停止）を却下し **ExifReader 4.41.3 (MPL-2.0)** を採用
  - AI 判定根拠は IPTC `digitalSourceType` 語彙に基づく（文字列 grep はしない）
- **Hono は不採用**（サーバーが本質的に不要。将来の API 化に備えエンジンを純粋関数として分離）
- UI 言語は **英語 + 日本語切替**（自前の辞書オブジェクト方式）
- ロードマップ確定（`roadmap.md`）
  - v0.2 = TrustMark。**MIT で公式 JS/ONNX デコーダーが存在**（`adobe/trustmark` の `js/`）
  - 出力は `c2pa.soft-binding`。**soft binding は解決しないが説明する（方針B）**で確定
  - モデルは必ず自前ホスト（第三者 CDN からの取得は利用事実の漏洩＋CSP 違反）
  - v0.3 は未確定（プラグイン API 公開 vs WAM 追加）。WAM は最新重みが MIT / 論文版は CC-BY-NC
  - SynthID は画像用ローカル検出器が未公開のため "blocked on upstream" と明記
- v0.2 を見据えた4抽象を v0.1 に先入れ
  （Detector レジストリ / AnalysisInput の bytes・pixels 分離 / coverage / Worker 化）
- **UI 文言を確定**（`copy.md`）
  - 二重否定をやめ「Sourceglass は、画像に記録された情報を読み取るだけのツールです」の肯定文 +
    verdict ごとの「これが意味しないこと」1文
  - **`✓` と緑を使わない**（記号と色は文言より強く伝わり「安全のお墨付き」と誤読されるため）
  - `NO_PROVENANCE_INFORMATION` は破線ボーダー、`NO_AI_RELATED_PROVENANCE_FOUND` は実線で区別
  - 「情報なし」画面では「領域が無い」/「領域はあるが技術情報のみ」を事実として出し分ける
    → `Coverage.withMeaningfulData` を型に追加
- **テストフィクスチャ方針を確定**（`fixtures.md`）
  - 公式テストファイル(CC BY-SA)は**原本のまま同梱** + NOTICE にクレジット
  - **c2patool で自前生成**が決め手（公式に AI サンプルが無く、`algorithmicMedia` は入手不能）
  - 実物は OpenAI / Firefly / Gemini から取得。ただし CI の厳密アサートには使わない
  - **フィクスチャはリサイズ不可**（再エンコードでメタデータが消える）→ 最初から 512px 程度で作る

- **README.md 初版**と**エージェント規約**を作成
  - `AGENTS.md` を正本（CodeX / Claude / その他共通）、`CLAUDE.md` は `@AGENTS.md` で参照 + Claude 固有の補足
  - README は英語主体。未実装であることを Status バナーで明示
  - README.ja.md も作成し相互リンク。`AGENTS.md` §1.5 に「英日を同時更新する」規約を追加
- **`LICENSE`（MIT / Copyright (c) 2026 N0ntar0）と `NOTICE` を作成**
  - NOTICE に c2pa-web(MIT) / ExifReader(MPL-2.0) / C2PA 公式テストファイル(CC BY-SA) を記載
  - ExifReader は**フォーク・パッチしない方針**を NOTICE に明文化（MPL-2.0 の伝播回避）
- README から参照している `e2e/privacy.spec.ts` / `public/_headers` は**まだ存在しない**（Phase 1・6 で作成）
- **ビジュアルデザインを確定**（`design.md` + 参照実装 HTML）
  - 完全モノクロ。強調は**地と図の反転**として定義（色ではなく関係なので両モードで自動成立）
  - **反転は見出し行のみ**（ブロック全体は「エラー・危険」に読まれるため却下）
  - 中立色はごくわずかに寒色寄り。ダークの `--fg` は純白にしない（反転が眩しくなる）
  - **Web フォント不使用**（外部リクエスト = プライバシー違反）。システムフォントのみ
  - **等幅は英数字のみ**。詳細テーブルに和訳ラベルを置かない
  - 記号は**自前 SVG 3つ**（`i-warn` / `i-info` / `i-none`）。カラー絵文字化を防ぐ
  - 実線 / 破線が4状態の唯一の構造的区別。ドロップゾーンも破線で語彙を揃える
  - `AGENTS.md` にビジュアル規約を追記
- **デザインを「文書」ではなく「ファイル」で渡す形にした**（引き継ぎで崩れるのを防ぐため）
  - `src/styles/tokens.css` / `src/styles/base.css` / `src/components/Icon.tsx` を**設計担当が作成**
  - この3つは**編集禁止**。実装側はクラスを当てるだけで、色・余白の判断が発生しない
  - `scripts/design-guard.mjs` + `design-lock.json` で規約違反を機械的に検出（動作確認済み）
    - 保護ファイルはハッシュで固定。変更するとガードが落ちる
    - 色リテラル直書き / `:root` 再定義 / Web フォント / `✓` / テキスト記号 /
      4px超の角丸 / 確率表示 / 「安全」断定 を検出
  - `package.json` に `design:guard` と `design:lock` スクリプトの追加が必要（Phase 1）

## Next Step

1. ディレクトリ名の変更（ユーザーが実行）: `cd ~ && mv tracelens sourceglass`
2. 初回コミット（コマンドはユーザーが実行。Claude は提案のみ）
3. CodeX に `implementation_plan.md` を渡し、**Phase 0（技術検証スパイク）から**着手させる
   - 成果は `ai_tasks/20260804_sourceglass_mvp_design/spike_result.md` に実 JSON / ログを貼らせる
   - 「remote manifest fetch を無効化できるか」「manifestStore の実 JSON 構造」を推測させない
4. Phase 0 の結果を Claude 側でレビューし、`C2paData` 型と rules を確定させる

## 未着手の論点

- ビジュアルデザイン（配色・タイポグラフィ）の具体化
- README 本文の執筆
- GitHub Actions の CI 定義

## Resume Prompt

Sourceglass の続きです。`ai_tasks/20260804_sourceglass_mvp_design/` の
`task.md` / `implementation_plan.md` / `roadmap.md` / `copy.md` / `fixtures.md` を読んでください。
技術選定・命名・UI 文言・フィクスチャ方針はすべて決定済みです。
次は Phase 0（技術検証スパイク）の結果レビューから始めます。
