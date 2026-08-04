# Last Updated: 2026-08-05 13:30

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 2 実装レビュー完了。指摘 F1〜F4 の修正待ち。Phase 3 は未着手。**

- 作業ブランチ: `feature/phase2-provenance-engine`（レビュー対象 `6c49526`）
- 新しい決定: [`decisions.md`](./decisions.md) D-029〜D-033

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- Phase 2 の解析エンジンを実装（型 / runner / containerScan / 3 detector / 宣言的ルール）
- 設計担当がレビューし、**全チェックの通過を実測確認**
  - typecheck / lint / design:guard / build / Vitest 31件 / Playwright 7件
  - `fixtures/` は 1.4 MB、1 MiB 超のファイルは 0 件
- 良かった点: `containerScan` の3フォーマット実装、`WeakMap` による EXIF/XMP 共有解析、
  型拡張の `settings.ts` への封じ込め
- **指摘4件（要修正）+ 1件（要検討）** → D-029〜D-033 として記録

## Next Step

**Phase 3 に進む前に D-029〜D-033 を修正する。**

1. **D-033** `claim_generator`（文字列）も読む。実測 JSON にあるのはこちらで、
   現状 C2PA の生成ツールが常に空。**アサーションも追加する**
2. **D-030** `validation_state: "Trusted"` → `signerTrust: 'trusted'`。テストも変更する
3. **D-029** `SourceResult` に `not-checked` を追加。スキップを `absent` にしない。
   `selectors.ts` の欠損キー既定値も直す
4. **D-031** 上限に ICC など ExifReader が読む全セグメントを含める。`huge-icc` フィクスチャを追加
5. **D-032** `privacy.spec.ts` は `vite build` の成果物に対して実行する（F5・Phase 3 前推奨）

軽微（任意）: `free()` 失敗で成功結果を上書きしない / `prepareMetadata` の reader 引数が
キャッシュヒット時に無視される / `METADATA_TOO_LARGE` 時に scan を捨てている

## Resume Prompt

Sourceglass の Phase 2 レビュー指摘の修正です。`ai_tasks/decisions.md` の D-029〜D-033 を読み、
その順に修正してください。設計判断は済んでいるので再検討は不要です。
修正後、typecheck / lint / test / design:guard / build / test:e2e をすべて通してから報告してください。
Phase 3 には自動で進まないでください。
