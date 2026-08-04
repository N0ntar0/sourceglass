# Last Updated: 2026-08-05 10:00

## Current Topic

Sourceglass — **Phase 1（プロジェクト基盤）完了。Phase 2 は未着手。**

参照フォルダ: `ai_tasks/20260804_sourceglass_mvp_design/`

- `task.md` — 要件・技術選定（Phase 0 の実測を反映済み）
- `implementation_plan.md` — Phase 0〜6 の作業指示 + **「Phase 0 の決定事項」D1〜D6**
- `roadmap.md` — v0.1 / v0.2(TrustMark) / v0.3 / 将来(SynthID)
- `copy.md` — UI 文言の確定版（**§2.5 に integrity / trust の文言を追加**）
- `fixtures.md` — テストフィクスチャ仕様
- `design.md` — ビジュアル仕様
  参照実装: https://claude.ai/code/artifact/afe097e6-a8b6-4093-8ef7-82626ca527fa
- `spike_result.md` — **Phase 0 の実測結果（実 JSON・ログ・数値）**
- `codex_prompt.md` — 実装担当へのプロンプト雛形

役割分担: 設計 = Claude / 実装 = CodeX
`ai_tasks/` は gitignore せずコミットする方針

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

### Phase 1 プロジェクト基盤（2026-08-05）

- Node 24 / Vite / TypeScript strict / React 19 の最小アプリを構築
- 承認済みの直接依存だけを導入し、C2PA と ExifReader は解析実装に備えてバージョンを固定
- `public/_headers` を CSP の唯一の定義元とし、Vite の開発・プレビューにも同じ CSP を適用
- `@vitejs/plugin-basic-ssl` で開発・プレビューを HTTPS 化
- Playwright で、本番ビルドの CSP 完全一致と初期表示時の外部通信0件を実測
- Vitest、ESLint、Prettier、Node 24 の GitHub Actions CI を整備
- `design:guard` / `design:lock` を package scripts に登録し、保護対象3ファイルは未変更
- Phase 0 の成果を `spike_result.md` に残し、役目を終えた `spike/` を削除
- 検証結果: `typecheck` / `lint` / Vitest / `design:guard` / build / Playwright はすべて成功

### Phase 0 と設計レビュー

- Phase 0 の技術検証スパイクが完了（実装担当）。9項目中8項目を実測、1項目は一部未確認
- **設計担当が spike_result.md をレビューし、4つの論点を決定**
  → `implementation_plan.md` の「Phase 0 の決定事項」に D1〜D6 として記載

### 決定内容

- **D1 remote manifest fetch: 保証は CSP に置く。**
  未公開設定に保証を負わせない（実行時に受理された ≠ 効いている）。
  `remoteManifestFetch: false` / `ocspFetch: false` は多層防御としてのみ渡し、
  型拡張は `detectors/c2pa/settings.ts` の1ファイルに閉じる。上流へ issue を出す。
  WASM の strings に `ocsp_fetch` もあったため同じ扱いにした。
  **remote-only fixture（`dcterms:provenance` に `https://example.invalid/...`）を
  Phase 2 で作り、外部リクエスト0件を e2e で検証する**（Phase 2 完了条件）
- **D2 開発も HTTPS に統一。** `workerSrc` が HTTP を拒否するため。
  開発と本番で構成を変えると CSP の破綻を本番でしか発見できない。
  `@vitejs/plugin-basic-ssl` を dev 依存として承認。**CSP は1本**、`blob:` を入れない。
  `worker-src 'self'` と `frame-ancestors 'none'` を追加。`_headers` は `/*` に当てる
  （Worker スクリプトのレスポンスにも CSP が必要）。
  e2e は dev サーバーではなく**ビルド成果物 + 本番ヘッダ**に対して実行する。
  副次効果: v0.2 の TrustMark が WebGPU に secure context を要求するため、どのみち必要
- **D3 独自 Worker は v0.1 で作らない。** 実測 0.4 ms / Long Task 0件。
  `src/workers/inspect.worker.ts` は作らない。ただし structured-clone 可能・DOM 非依存の
  制約は維持する。v0.2 の ONNX は runner の「detector 単位の実行戦略」として足す。
  **積み残し: ExifReader（JS・メインスレッド）の停止時間を 10MB 級で Phase 2 に測定する**
- **D4 C2PA SDK は遅延ロード。** WASM が raw 8.27MB / gzip 3.03MB だったため、
  初回解析時に動的 import。SDK はシングルトン。`free()` は finally で必ず呼ぶ
- **D5 C2PA API の実形を確定。** `createC2pa()` は Promise（await 必須）。
  `manifests` は配列ではなく object。C2PA 無し → `null`（absent）、破損/0バイト → 例外（error）。
  例外に機械可読な code は無いので独自コードへ境界で変換。**message で verdict を判定しない**
- **D6 integrity と signerTrust を型で分離（最重要）。**
  `validation_state: "Valid"` と `signingCredential.untrusted` は同時に成立する。
  `signingCredential.untrusted` を `'not-trusted'` にマップしない（MVP は常に `'not-evaluated'`）。
  **`integrity === 'invalid'` の manifest から AI シグナルを `explicit` として採用しない。**
  テスト用フィクスチャは `adobe-20220124-E-uri-CA.jpg`（ハッシュ不一致）が既に手元にある

### 更新した文書

- `implementation_plan.md` — Phase 0 の決定事項 D1〜D6、型（`C2paValidation` / `IntegrityState` /
  `SignerTrust` / `C2paErrorCode`）、ディレクトリ（`workers/` 削除・`detectors/c2pa/` 詳細化）、
  依存（`@vitejs/plugin-basic-ssl`）、テストと受け入れ基準
- `task.md` — 未確定リストを実測結果表に置換、CSP 確定版、Known limitations 追記
- `copy.md` — §2.5 に `integrity.invalid` と `trust.notEvaluated` を追加
- `AGENTS.md` — §2.5（integrity と trust の混同禁止）、§2.6（保証は CSP に置く）を追加

## Next Step

**Phase 2 にはまだ着手しない。最初にフィクスチャ整備を完了する。**

1. `fixtures.md` に従って Phase 2 用フィクスチャを揃える（remote-only fixture を含む）
2. ライセンス・再配布条件とハッシュを確認し、再保存・リサイズせず配置する
3. フィクスチャ整備のレビュー後に Phase 2 解析エンジンへ進む
4. Phase 2 の完了条件に D1・D3・D6 の検証が入っている。飛ばさないこと

Phase 1 の最小 UI は製品名と確定済みタグラインのみ。Phase 3 の UI は未実装。

## Resume Prompt

Sourceglass は Phase 1 のプロジェクト基盤まで完了しています。`AGENTS.md`、
`ai_tasks/context_snapshot.md`、`fixtures.md`、`implementation_plan.md` の D1〜D6 と Phase 2 を読み、
解析エンジンへ進む前提として Phase 2 用フィクスチャの整備とレビューから再開してください。
