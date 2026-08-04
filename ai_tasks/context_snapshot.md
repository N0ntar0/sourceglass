# Last Updated: 2026-08-05 02:10

## Current Topic

Sourceglass — Phase 0 完了・設計レビュー完了。**Phase 1 に進んでよい。**

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

**Phase 1（プロジェクト基盤）に進んでよい。**

1. Phase 1: Vite + TS + React の土台、HTTPS 開発環境、`public/_headers`、
   `package.json` に `design:guard` / `design:lock` を追加、CI
2. Phase 2 着手前に `fixtures.md` のフィクスチャを揃える（remote-only fixture を含む）
3. Phase 2 の完了条件に D1・D3・D6 の検証が入っている。飛ばさないこと

`spike/` は Phase 1 の土台ができた時点で削除してよい（成果は `spike_result.md` に記録済み）。

## Resume Prompt

Sourceglass の Phase 1 です。`AGENTS.md` と
`ai_tasks/20260804_sourceglass_mvp_design/implementation_plan.md`（特に「Phase 0 の決定事項」
D1〜D6）を読んでください。Phase 0 の実測と設計レビューは完了しており、
remote fetch・Worker/CSP・二重 Worker・integrity/trust の4点はすべて決定済みです。
再検討せず、Phase 1 の実装に進んでください。
