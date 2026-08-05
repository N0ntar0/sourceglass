# Last Updated: 2026-08-05 18:40

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 5（ドキュメント整備）実装完了・レビュー待ち。Phase 6 は未着手。**

- 作業ブランチ: `feature/phase3-ui`
- 設計決定: [`decisions.md`](./decisions.md) D-001〜D-037

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- README 英日版を実装済みの挙動へ同時更新
- 日本語 UI、ブラウザ言語の既定値、言語選択の保存を追記
- 未対応形式を「調べていない」と表示する意図的な区別を追記
- Known limitations に 256 KiB（262,144 bytes）のメタデータ上限と実測理由を追記
- privacy E2E が初期ロードと画像解析経路の双方を検査する現状へ更新
- Development を Node.js 24 と分割済み E2E スクリプトへ更新
- 節構成は英日とも15行、Known limitations は英日とも8項目、ローカルリンクは各9件有効
- 全チェック通過: typecheck / lint / Vitest 56件 / design:guard / build /
  provenance E2E 6件 / app E2E 14件

## Next Step

Phase 5 の README 英日差分をレビューする。承認されるまで Phase 6 には進まない。

## 未対応（軽微・任意のまま）

- `i18n` がモジュールスコープの可変状態 + `App` の `useState` ミラー。
  `React.memo` / `useMemo` を後から入れると静かに古い言語が残る（`useSyncExternalStore` で解消可）
- `emptyReason.tooLarge` の "256 KiB" 直書き / `Inspector` に catch が無い /
  `reader.free()` 失敗が成功結果を上書き / `prepareMetadata` の reader 引数 /
  `METADATA_TOO_LARGE` 時に `scan` を捨てている

## Resume Prompt

Sourceglass Phase 5 の README 英日版は更新・検証済みです。節構成、Known limitations、
プライバシー説明、Development 手順をレビューしてください。承認まで Phase 6 には進まないでください。
