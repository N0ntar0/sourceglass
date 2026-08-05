# Last Updated: 2026-08-05 18:53

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 5 レビュー指摘修正完了・再レビュー待ち。Phase 6 は未着手。**

- 作業ブランチ: `feature/phase3-ui`
- 設計決定: [`decisions.md`](./decisions.md) D-001〜D-037

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- AGENTS.md §1.3 の更新済み適用範囲に従い、限界を述べる否定文を確定文へ復元
- `copy.md` §6 の英日免責文を改行も含め一字一句一致で README に反映
- `AI probability: 87%` の具体例を英日とも確定文へ復元
- Verifiable privacy の懐疑的な読者への語りかけを英日とも復元
- `cannot be found` と `third-party AI classification service` は維持
- 節構成は英日とも15行、Known limitations は英日とも8項目のまま
- 全チェック通過: typecheck / lint / Vitest 56件 / design:guard / build /
  provenance E2E 6件 / app E2E 14件

## Next Step

Phase 5 のレビュー修正差分を再レビューする。承認されるまで Phase 6 には進まない。

## 未対応（軽微・任意のまま）

- `i18n` がモジュールスコープの可変状態 + `App` の `useState` ミラー。
  `React.memo` / `useMemo` を後から入れると静かに古い言語が残る（`useSyncExternalStore` で解消可）
- `emptyReason.tooLarge` の "256 KiB" 直書き / `Inspector` に catch が無い /
  `reader.free()` 失敗が成功結果を上書き / `prepareMetadata` の reader 引数 /
  `METADATA_TOO_LARGE` 時に `scan` を捨てている

## Resume Prompt

Sourceglass Phase 5 の README レビュー指摘は修正・検証済みです。copy.md §6 の完全一致、
具体例、Verifiable privacy の語りかけを再レビューしてください。Phase 6 には進まないでください。
