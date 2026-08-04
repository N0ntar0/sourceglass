# Last Updated: 2026-08-05 01:10

# CodeX への依頼プロンプト

以下をそのまま貼る。Phase が進んだら「今回のスコープ」の節だけ差し替える。

---

```
あなたはこのリポジトリ（Sourceglass）の実装担当です。
設計は完了しており、ドキュメントとして確定しています。設計をゼロから考え直さないでください。

## 最初にやること

次の順で読んでください。読む前にコードを書き始めないでください。

1. AGENTS.md                                             ← 行動規約。最重要
2. ai_tasks/context_snapshot.md                          ← 現在地
3. ai_tasks/20260804_sourceglass_mvp_design/task.md      ← 要件と技術選定の根拠
4. ai_tasks/20260804_sourceglass_mvp_design/implementation_plan.md
5. ai_tasks/20260804_sourceglass_mvp_design/roadmap.md
6. ai_tasks/20260804_sourceglass_mvp_design/copy.md      ← UI 文言（言い換え禁止）
7. ai_tasks/20260804_sourceglass_mvp_design/fixtures.md
8. ai_tasks/20260804_sourceglass_mvp_design/design.md    ← ビジュアル仕様

## このプロダクトについて（誤解しやすいので先に）

Sourceglass は AI 画像判定器では**ありません**。
画像に実際に記録されている来歴情報（C2PA / EXIF / XMP）を読み取って提示するだけのツールです。

したがって次は永久に禁止です。実装しないでください。

- 確率・スコア表示（「AI probability: 87%」等）
- 「AI生成ではありません」「安全です」といった断定
- 画像の内容・画素から AI を推測する処理
- 画像・メタデータ・解析結果の外部送信
- LLM API / AI検出 API の利用
- 実行時にネットワークを必要とする依存ライブラリの追加

判断に迷ったときの基準は AGENTS.md の末尾にあります。

## 今回のスコープ: Phase 0（技術検証スパイク）のみ

**実装を始めないでください。Phase 0 は調査です。**

implementation_plan.md の Phase 0 に9つの確認項目があります。
`spike/` に最小の Vite アプリを作り、9項目すべてを**実測**してください。

成果物は
ai_tasks/20260804_sourceglass_mvp_design/spike_result.md
に、**実際の JSON・ログ・数値をそのまま貼り付けて**記録してください。

要約で済ませないでください。「ドキュメントによると」は成果物として認められません。
この Phase の目的は、C2PA の API を推測で実装させないことです。

特に重要な3項目:

- #2 `reader.fromBlob()` → `manifestStore()` が返す **JSON の全文**
- #5 remote manifest fetch を無効化する設定があるか
      （node_modules の .d.ts を実際に開いて確認してください）
- #8 解析中にメインスレッドが何 ms 止まるか（Worker 化の判断材料）

なお `c2pa` という npm パッケージは deprecated です。
`@contentauth/c2pa-web` を使ってください。

## 編集してはいけないファイル

次はデザイン仕様そのものです。設計担当が管理しています。**編集しないでください。**

  src/styles/tokens.css
  src/styles/base.css
  src/components/Icon.tsx

これらはハッシュで保護されており、変更すると `npm run design:guard` が落ちます。
新しいクラスやアイコンが必要になった場合は、実装せずに相談してください。

## git

`git commit` / `git push` / `git reset --hard` を実行しないでください。
コミットメッセージ案の提示までにしてください。

## 作業ログ

作業が一区切りしたら ai_tasks/context_snapshot.md を更新してください。
各ドキュメント冒頭の `# Last Updated:` も更新してください。

## 報告

終わったら次を簡潔に報告してください。

- 9項目のうち何が確認でき、何が確認できなかったか
- 想定と違った点（設計の前提が崩れる発見があれば最優先で書いてください）
- 次の Phase に進む前に決めるべきこと
```

---

## Phase 1 用（Phase 0 レビュー完了後・そのまま貼れる）

```
Sourceglass の Phase 1（プロジェクト基盤）を実装してください。

Phase 0 の実測と設計レビューは完了しています。**再検討しないでください。**

先に読むもの:
  AGENTS.md
  ai_tasks/context_snapshot.md
  ai_tasks/20260804_sourceglass_mvp_design/implementation_plan.md
    ← 特に「Phase 0 の決定事項」D1〜D6。ここが今回の前提です

決定済みで、実装時に迷わないでほしい点:

- 外部通信を止めているのは CSP です。ライブラリの設定ではありません。
  `remoteManifestFetch: false` は多層防御であり、効かなくても安全な位置づけです。
  公開型に無い設定の型拡張は detectors/c2pa/settings.ts の1ファイルだけに閉じてください。
  パッケージ型への declaration merging はしないでください。

- 開発も HTTPS です（@vitejs/plugin-basic-ssl を dev 依存として承認済み）。
  CSP は1本だけで、開発と本番で同じものを使います。blob: を入れないでください。
  public/_headers は /* に当ててください。Worker スクリプトのレスポンスにも
  CSP が乗る必要があります。

- src/workers/inspect.worker.ts は作りません。実測でメインスレッド停止が 0.4ms でした。
  ただし structured-clone 可能・DOM 非依存の制約は維持してください。

- src/styles/tokens.css、src/styles/base.css、src/components/Icon.tsx は
  設計担当が作成済みです。編集しないでください。ハッシュで保護されています。
  package.json に design:guard と design:lock のスクリプトを追加してください。

Phase 1 の完了時に次を通してください。
  npm run typecheck && npm run design:guard && npm run build

spike/ は Phase 1 の土台ができた時点で削除して構いません
（成果は spike_result.md に記録済みです）。

Phase 2 には自動で進まないでください。Phase 1 が終わったら報告してください。
```

---

## Phase 2 以降でスコープを差し替えるときの雛形

```
## 今回のスコープ: Phase N（...）

implementation_plan.md の Phase N に従って実装してください。
Phase N-1 の成果（...）を前提とします。

完了したら次を通してください。
  npm run typecheck && npm run test && npm run design:guard && npm run build
```

UI 実装（Phase 3）を依頼するときは、次を必ず添える。

```
UI は design.md と、参照実装
https://claude.ai/code/artifact/afe097e6-a8b6-4093-8ef7-82626ca527fa
のとおりに組んでください。

src/styles/base.css に必要なクラスはすべて定義済みです。
コンポーネントからは**クラスを当てるだけ**にしてください。
色・余白・書体を新しく決める作業は発生しません。発生したら、それは設計側の漏れです。
実装せずに相談してください。

文言は copy.md の確定版をそのまま使ってください。言い換えないでください。
```
