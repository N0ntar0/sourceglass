# Last Updated: 2026-08-04 23:50

## Current Topic

Sourceglass — Phase 0 C2PA 技術検証スパイク
参照フォルダ: `ai_tasks/20260804_sourceglass_mvp_design/`

- 実測結果: `ai_tasks/20260804_sourceglass_mvp_design/spike_result.md`
- 検証アプリ: `spike/`
- 作業ブランチ: `feature/phase0-c2pa-spike`（`develop` から作成）

## Working Agreement

- ユーザーの明示許可により、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断またはレビューが必要になった場合は、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- `develop` を `main` から作成し、`feature/phase0-c2pa-spike` を作成して切り替えた
- 指定された設計文書8件を順番どおり全文確認した
- `spike/` に Vite + TypeScript + `@contentauth/c2pa-web@0.13.1` の最小検証アプリを作成した
- C2PA 公式 public test files 5件を原本のまま取得し、SHA-256 を記録した
- Chrome 144 + CDP で Phase 0 の9項目を実測した
  - WASM と全資産のリクエストは同一オリジン（Blob Worker を除く外部 URL 0件）
  - `manifestStore()` の公式 JPEG 実 JSON 全文を取得
  - `digitalSourceType` の実パスを公式 PDF で3件取得
  - validation の `Valid` / `Invalid`、trust list 未設定時の `signingCredential.untrusted` を取得
  - C2PA 無しは `null`、破損 JPEG は `InvalidAsset`、0 bytes は `UnsupportedType`
  - 1.63 MB JPEG の5回解析で推定最大メインスレッド停止 0.4000000059604645 ms、Long Task 0件
  - build の WASM は raw 8269371 bytes / gzip 3027183 bytes
- `npm run build`（`tsc --noEmit && vite build`）成功
- 実 JSON、CDP Network ログ、型定義抜粋、測定値を `spike_result.md` に記録した

## Important Findings

- `createC2pa()` は `Promise<C2paSdk>` を返すため `await` が必要
- c2pa-web 0.13.1 は内部 Web Worker で WASM を実行する
- `workerSrc` は HTTP localhost を拒否し HTTPS を要求する。HTTP 開発時は Blob Worker が必要
- `remote_manifest_fetch` は WASM 側に存在するが、c2pa-web の公開 `Settings.d.ts` には無い
- 型拡張した `remoteManifestFetch: false` は実行時に受理されたが、remote-only fixture が無く
  実際の remote fetch 遮断は未再現
- `validation_state: "Valid"` と `signingCredential.untrusted` は同時に成立する

## Next Step

1. 設計担当が `spike_result.md` をレビューする
2. Phase 1/2 前に次を決定する
   - 公開型に無い `remoteManifestFetch: false` の扱いと remote-only fixture の調達方法
   - HTTPS 限定 `workerSrc`、HTTP 開発時 Blob Worker、CSP の整合方法
   - Sourceglass の `inspect.worker.ts` と c2pa-web 内部 Worker の二重化方針
   - `validation_state` と trust status を分離する内部型
3. 決定後に Phase 1 へ進む。現時点では Phase 1 の製品実装に着手しない

## Resume Prompt

Sourceglass Phase 0 の実測が完了しました。`ai_tasks/20260804_sourceglass_mvp_design/spike_result.md` をレビューし、remote manifest fetch の未公開設定、workerSrc/CSP、二重 Worker、validation と trust の分離方針を決めてから Phase 1 に進んでください。
