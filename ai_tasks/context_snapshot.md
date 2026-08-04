# Last Updated: 2026-08-05 14:20

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 2 レビュー指摘 D-029〜D-033 の修正完了。Phase 3 は未着手。**

- 作業ブランチ: `feature/phase2-provenance-engine`
- 対象決定: [`decisions.md`](./decisions.md) D-029〜D-033

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- `claim_generator` と `claim_generator_info` の両方を正規化し、公式フィクスチャでも検証
- `validation_state: Trusted` を `signerTrust: trusted` にマップ
- `SourceResult` に `not-checked` を追加し、runner と selectors で absent との区別を維持
- JPEG の全 APPn、PNG の eXIf/iTXt/tEXt/zTXt/iCCP、WebP の EXIF/XMP/ICCP を計数
- 300 KB ICC の `huge-icc.jpg` を追加し、ExifReader 前の `METADATA_TOO_LARGE` を検証
- provenance E2E は専用ハーネス、privacy E2E は出荷用 `vite build` に分離
- typecheck / lint / Vitest 41件 / provenance E2E 6件 / privacy E2E 1件を確認

## Next Step

Phase 2 のレビュー修正を再レビューする。承認されるまで Phase 3 には進まない。

## Resume Prompt

Sourceglass の Phase 2 レビュー指摘 D-029〜D-033 は修正済みです。`AGENTS.md` →
`ai_tasks/README.md` → `ai_tasks/decisions.md` → `ai_tasks/context_snapshot.md` の順に読み、
差分と検証結果を再レビューしてください。承認されるまで Phase 3 には進まないでください。
