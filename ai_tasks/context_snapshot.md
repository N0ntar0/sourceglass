# Last Updated: 2026-08-05 17:55

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 4（i18n）実装完了・レビュー待ち。Phase 5 は未着手。**

- 作業ブランチ: `feature/phase3-ui`
- 設計決定: [`decisions.md`](./decisions.md) D-001〜D-036

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- `ja.ts` を `Record<TranslationKey, string>` で追加し、確定済み日本語文言を収録
- `navigator.language` を既定、`localStorage` の選択を優先する英日切替を実装
- 既存 `.btn` だけで切替 UI を追加。新しい CSS クラスは追加していない
- 詳細テーブルの見出し・フィールド・状態値は英数字のまま維持
- 日本語の explicit / heuristic / AI無し / 記録無しを E2E とスクリーンショットで確認
- 日本語の not-checked を E2E、tampered を合成レポートのユニットテストで確認
- `ja.ts` から `status.error` を一時削除し、typecheck が TS2741 で失敗することを実測後に復元
- 解析エンジンとデザイン保護3ファイルは未変更
- 全チェック通過: typecheck / lint / Vitest 56件 / design:guard / build /
  provenance E2E 6件 / app E2E 14件

## Next Step

Phase 4 の実装差分と日本語表示をレビューする。承認されるまで Phase 5 には進まない。

## 未対応（軽微・任意のまま）

- `emptyReason.tooLarge` の "256 KiB" がコンポーネントに直書き（定数から導出したい）
- `Inspector` に catch が無く、reject 時に `busy` が残る
- `reader.free()` 失敗が成功結果を error で上書きする
- `prepareMetadata` の reader 引数がキャッシュヒット時に無視される
- `METADATA_TOO_LARGE` 時に `scan` を捨てている

## Resume Prompt

Sourceglass Phase 4 の i18n は実装・検証済みです。英日辞書、言語選択の保存、
日本語6状態、翻訳漏れ型ガードをレビューしてください。承認まで Phase 5 には進まないでください。
