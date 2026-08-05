# Last Updated: 2026-08-05 20:10

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 6 ローカル準備完了。本番デプロイの人間操作待ち。**

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
- Cloudflare CLI・認証用環境変数はこの環境に無く、アカウント操作なしではデプロイ不可
- 本番 URL 未確定のため CSP は**未実測**。`deploy_verification.md` はまだ作成していない

## Next Step

1. feature ブランチを push し、`develop` へ統合する（main には触れない）
2. Cloudflare Pages を production branch `develop`、build `npm run build`、output `dist`、
   `NODE_VERSION=24` で作成する
3. 発行された本番 URL を実装担当へ渡す
4. HTML と C2PA Worker の CSP を curl で実測し、実出力を `deploy_verification.md` に記録する
5. 実測が両方通るまで v0.1 リリース可とは判断しない

## 未対応（軽微・任意のまま）

- `i18n` がモジュールスコープの可変状態 + `App` の `useState` ミラー
- `emptyReason.tooLarge` の "256 KiB" 直書き / `Inspector` に catch が無い /
  `reader.free()` 失敗が成功結果を上書き / `prepareMetadata` の reader 引数 /
  `METADATA_TOO_LARGE` 時に `scan` を捨てている

## Resume Prompt

Sourceglass Phase 6 は CI 準備済みで Cloudflare Pages の人間操作待ちです。
本番 URL を受け取り、HTML と Worker の CSP を curl で実測して生ログを記録してください。
