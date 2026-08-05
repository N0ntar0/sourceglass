# Last Updated: 2026-08-05 10:12

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 6 の develop デプロイ検証完了。本番デプロイ待ち。**

- 作業ブランチ: `feature/phase3-ui`
- 統合先: `develop`（GitHub のデフォルトブランチ = PR のベース。D-039）
- 設計決定: [`decisions.md`](./decisions.md) D-001〜D-040

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- CI に `dist/` の予期しない外部 origin 検査を追加
- W3C / Adobe / IPTC 名前空間と React エラー参照だけを非通信 origin として明示許可
- 現行 build で検査通過。`unexpected.example.invalid` の一時投入で exit 1 を実測後、削除済み
- typecheck / lint / design:guard / build / Vitest 56件 /
  provenance E2E 6件 / app E2E 14件 すべて通過
- Cloudflare Pages `https://develop.sourceglass.pages.dev/` へのデプロイ完了
- develop の HTML と `assets/c2pa_worker-DXNlPeXm.js` のレスポンスで同一 CSP を実測
- `https://sourceglass.pages.dev/` は HTTP 404 で CSP なし。本番検証は未完了
- 生の curl 出力を `ai_tasks/20260805_sourceglass_phase6/deploy_verification.md` に記録

## Next Step

1. Phase 6 の実測記録と snapshot をコミットし、feature ブランチを push する
2. 人間が main へマージして本番をデプロイする（v0.1 タグも人間が実施する）
3. 本番 HTML と C2PA Worker の CSP を再実測してリリース判断を確定する

## 未対応（軽微・任意のまま）

- `i18n` がモジュールスコープの可変状態 + `App` の `useState` ミラー
- `emptyReason.tooLarge` の "256 KiB" 直書き / `Inspector` に catch が無い /
  `reader.free()` 失敗が成功結果を上書き / `prepareMetadata` の reader 引数 /
  `METADATA_TOO_LARGE` 時に `scan` を捨てている

## Resume Prompt

Sourceglass Phase 6 は develop デプロイの HTML と C2PA Worker で CSP を実測済みです。
本番は未デプロイのため、人間の main マージ後に本番 URL で同じ実測を行ってください。
