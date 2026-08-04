# Last Updated: 2026-08-05 12:30

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 2（解析エンジン）実装完了。Phase 3 は未着手。**

- 作業ブランチ: `feature/phase2-provenance-engine`
- 設計決定: [`decisions.md`](./decisions.md) D-001〜D-028
- 実測記録: [`20260805_sourceglass_phase2/measurement.md`](./20260805_sourceglass_phase2/measurement.md)

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- `src/features/provenance/` に型、runner、container scan、C2PA / EXIF / XMP detector、rules を実装
- React / inspector / platform の import 禁止を手動確認し、Vitest の既定環境を node に維持
- 256 KiB のメタデータ上限と 8 MiB の AVIF / HEIC 代替上限を実装
- 上限直下 248,873 bytes の ExifReader 停止時間を実測（最大 44.3 ms）
- C2PA の全 manifest / action 走査、integrity と signerTrust の分離、invalid 時の降格を実装
- remote-only を含む Playwright 解析経路で外部オリジンへのリクエスト 0 件を確認
- フィクスチャの出典・ライセンス・SHA-256 を記録し、全ファイルを 1 MiB 未満に調整
- Phase 2 の Vitest 31件、Playwright 7件を追加

## Next Step

Phase 2 の実装レビューを受ける。Phase 3 はフィクスチャと Phase 2 のレビュー承認後に着手する。

## Resume Prompt

Sourceglass の Phase 2 実装は完了しています。`AGENTS.md` → `ai_tasks/README.md` →
`ai_tasks/decisions.md` → `ai_tasks/context_snapshot.md` の順に読み、Phase 2 の差分と検証結果を
レビューしてください。承認されるまで Phase 3 には進まないでください。
