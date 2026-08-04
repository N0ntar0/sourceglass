# Last Updated: 2026-08-05 14:45

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **Phase 2 完了・承認済み。Phase 3（UI）に進んでよい。**

- 作業ブランチ: `feature/phase2-provenance-engine`（承認コミット `d810dfa`）
- 設計決定: [`decisions.md`](./decisions.md) D-001〜D-034

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- Phase 2 レビュー指摘 D-029〜D-033 を修正し、設計担当が**再レビューして承認**
  - `claim_generator` / `claim_generator_info` の両方を正規化。**公式フィクスチャで実際に検証**
  - `validation_state: "Trusted"` → `signerTrust: 'trusted'`（到達しない旨のコメント付き）
  - `SourceResult` に `not-checked` を追加。runner と selectors の両方で伝播
  - 上限計数を全 APPn / PNG 5種 / WebP 3種に拡大。`huge-icc.jpg` で回帰検証
  - privacy E2E を**出荷用 `vite build` の成果物**に対して実行するよう分離
- 設計担当が実測確認: typecheck / lint / design:guard / build /
  **Vitest 41件 / provenance E2E 6件 / privacy E2E 1件**、`fixtures/` 1.7 MB（1 MiB 超 0件）
- privacy E2E が `index-B5nkaHvQ.js`（本番ビルドと同一ハッシュ）に対して走ることを確認
- 新しい決定 **D-034**（UI は `not-checked` を「記録が無い」と表示しない）を追加

## Next Step

**Phase 3（UI）。** `implementation_plan.md` Phase 3 と `design.md` に従う。

1. `platform/` に `AnalysisInput` の実装（File → bytes / pixels）を書く。
   `features/provenance/` からは import しない（eslint が禁止済み）
2. 文言は最初から `src/i18n/en.ts` に置く。Phase 4 は `ja.ts` と切替を足すだけにする
3. `src/styles/base.css` のクラスを**当てるだけ**。色・余白を新しく決めない
4. `not-checked` の表示（D-034）と `coverage` の表示を必ず入れる
5. `OptionalChecks.tsx` の差し込み位置を確保する（v0.2 用・v0.1 では非表示）

## 未対応（軽微・任意）

- `reader.free()` 失敗が成功結果を error で上書きする
- `prepareMetadata` の reader 引数がキャッシュヒット時に無視される
- `METADATA_TOO_LARGE` 時に `scan` を捨てている

## Resume Prompt

Sourceglass の Phase 3（UI）です。`AGENTS.md` → `ai_tasks/README.md` →
`ai_tasks/decisions.md` → `implementation_plan.md` Phase 3 → `copy.md` → `design.md`
の順に読んでください。Phase 2 は承認済みです。
`src/styles/` と `src/components/Icon.tsx` は編集禁止で、クラスを当てるだけにしてください。
