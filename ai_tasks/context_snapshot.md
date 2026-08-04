# Last Updated: 2026-08-05 17:00

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 3 完了・承認済み。Phase 4（i18n）に進んでよい。**

- 作業ブランチ: `feature/phase3-ui`（承認コミット `3f7217a`）
- 設計決定: [`decisions.md`](./decisions.md) D-001〜D-036

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- Phase 3 レビュー指摘3件を修正し、設計担当が**再レビューして承認**
  - Summary の AI 行を `ai-generation` / `ai-editing` に限定（`isAiRelatedSignal` を抽出）
  - `not-checked` を `reason` で分離。`not-requested` は表示を変えない（D-036）
  - integrity invalid 由来の降格に `result.ai.tampered.note` を適用（D-035）
- 設計担当が実測確認: typecheck / lint / design:guard / build /
  **Vitest 50件 / provenance E2E 6件 / app E2E 8件**
- 追加テストが**誤った表示の不在**をアサートしている点が良い
  （v0.2 の TrustMark を模した deferred detector の回帰テストを含む）
- 解析エンジンとデザイン保護3ファイルは未変更（差分で確認）

## Next Step

**Phase 4（i18n）。** `implementation_plan.md` Phase 4 と `copy.md` に従う。

1. `src/i18n/ja.ts` を `Record<TranslationKey, string>` として作る。**翻訳漏れを型エラーにする**
2. 言語切替（`navigator.language` 既定 / `localStorage` 保存）
3. `copy.md` の日本語をそのまま使う。言い換えない
4. 4状態 + `not-checked` + `tampered` を日本語でも表示確認する

## 未対応（軽微・任意のまま）

- `emptyReason.tooLarge` の "256 KiB" がコンポーネントに直書き（定数から導出したい）
- `Inspector` に catch が無く、reject 時に `busy` が残る
- `reader.free()` 失敗が成功結果を error で上書きする
- `prepareMetadata` の reader 引数がキャッシュヒット時に無視される
- `METADATA_TOO_LARGE` 時に `scan` を捨てている

## Resume Prompt

Sourceglass の Phase 4（i18n）です。`AGENTS.md` → `ai_tasks/README.md` →
`ai_tasks/decisions.md` → `implementation_plan.md` Phase 4 → `copy.md` の順に読んでください。
Phase 3 は承認済みです。`copy.md` の日本語を言い換えずにそのまま使ってください。
