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

承認済みの依存（これ以外を足さないでください）:

  dependencies
    react, react-dom, @contentauth/c2pa-web, exifreader

  devDependencies
    vite, @vitejs/plugin-react, @vitejs/plugin-basic-ssl, typescript,
    vitest, @playwright/test, eslint, typescript-eslint, prettier,
    @types/react@19, @types/react-dom@19, @types/node@24

@types/* は今後も個別承認なしで追加して構いません（AGENTS.md の依存ポリシー参照）。
それ以外の追加は、理由を添えて相談してください。

Node は 24 を使ってください。@types/node のメジャーと CI の Node を揃えます。
ズレると再現性の低い型エラーの原因になります。

.gitignore を作成してください。内容は implementation_plan.md の Phase 1 に記載の
確定版をそのまま使ってください。ai_tasks/ と fixtures/ と .vscode/ は
意図的に除外していません。勝手に足さないでください。

Phase 1 の完了時に次を通してください。
  npm run typecheck && npm run design:guard && npm run build

spike/ は Phase 1 の土台ができた時点で削除して構いません
（成果は spike_result.md に記録済みです）。

Phase 2 には自動で進まないでください。Phase 1 が終わったら報告してください。
Phase 2 はフィクスチャ整備が着手の前提になっています。
```

---

## Phase 2 用（Phase 1 レビュー完了後・そのまま貼れる）

```
Sourceglass の Phase 2（解析エンジン）を実装してください。

Phase 0 と Phase 1 は完了・レビュー済みです。設計判断は再検討しないでください。

先に読むもの（この順で）:
  AGENTS.md
  ai_tasks/README.md          ← ドキュメントの索引と、どこに何を書くかのルール
  ai_tasks/decisions.md       ← なぜそうなっているのか。D-001〜D-021
  ai_tasks/context_snapshot.md
  ai_tasks/20260804_sourceglass_mvp_design/implementation_plan.md  ← Phase 2
  ai_tasks/20260804_sourceglass_mvp_design/fixtures.md

## 着手順（この順を守ってください）

### 1. 先に境界を作る（implementation_plan.md §2.0）

エンジンを1行も書く前にやってください。後から入れると、
既に混入した依存を剥がす作業になります。

- eslint で src/features/provenance/ から react / react-dom /
  features/inspector / platform を import できないようにする
- Vitest の既定環境は node のままにする。jsdom はファイル単位でのみ有効化する
- **境界が効いていることを一度手で確認してください。**
  provenance 配下に react を import して lint が落ちることを確認し、
  確認した事実を報告に含めてください。動作確認していないガードは飾りです。

### 2. フィクスチャを揃える（fixtures.md）

- リサイズ・再保存をしないでください。再エンコードでテスト対象のメタデータが消えます
- remote-only fixture（dcterms:provenance に https://example.invalid/... を書いたもの）を
  必ず作ってください。D-011 の検証に必要です
- ライセンスと SHA-256 を記録してください

### 3. エンジンを実装する

型 → detector → rules の順。**UI は書かないでください。**

特に注意してほしい点（実測にもとづく確定事項です）:

- createC2pa() は Promise を返します。await が必要です
- manifests は配列ではなく label をキーにした object です。
  active_manifest だけでなく全 manifest の assertions を走査してください
- C2PA 無し → reader が null → absent。破損・0バイト → 例外 → error。
  同じ経路にしないでください
- 例外の message 文字列で verdict を判定しないでください。
  境界で C2paErrorCode に変換してください
- integrity と signerTrust は別フィールドです。
  validation_state: "Valid" と signingCredential.untrusted は同時に成立します。
  signingCredential.untrusted を 'not-trusted' にマップしないでください（常に 'not-evaluated'）
- integrity === 'invalid' のとき、C2PA 由来の AI シグナルを explicit にしないでください
- algorithmicMedia（非AI）を AI 判定しないでください。回帰テストを必ず書いてください
- 「意味のある来歴フィールド」の allowlist を雑にしないでください。
  色空間しか入っていない JPEG が「来歴あり・AI検出なし」になると、
  ユーザーに誤った安心を与えます

## 完了条件

  npm run typecheck && npm run lint && npm run test && npm run design:guard && npm run build

加えて Phase 2 の完了条件として次を満たしてください。

- remote-only fixture で外部リクエストが 0 件（D-011）
- adobe-20220124-E-uri-CA.jpg で integrity === 'invalid' になり、
  C2PA 由来シグナルが explicit にならない（D-016）
- 公式テストファイルで signerTrust === 'not-evaluated' になる
- **ExifReader のメインスレッド停止時間を 10MB 以上のファイルで測定する（D-013 の積み残し）。
  50ms を超えるなら実装を進めずに相談してください**

## 依存

承認済み以外を足さないでください。@types/* のみ個別承認不要です。
Phase 3 用に eslint-plugin-react-hooks は事前承認済みです。

## 作業ログ

- 判断・選択・却下した案は ai_tasks/decisions.md に追記してください
- context_snapshot.md は現在地だけを書き、60行以内に保ってください。
  変更履歴にしないでください

## 報告

Phase 3 には自動で進まないでください。終わったら次を報告してください。

- 完了条件それぞれの結果（通ったものは通ったと、落ちたものは落ちたと）
- ExifReader の測定値
- 設計の前提が崩れる発見があれば最優先で
```

---

## Phase 2 再開用（ExifReader 実測レビュー後・そのまま貼れる）

```
Sourceglass の Phase 2 を再開してください。

ExifReader の実測レビューは完了しました。決定は D-022〜D-028 です。再検討しないでください。

先に読むもの:
  ai_tasks/decisions.md            ← 特に D-022〜D-028
  ai_tasks/20260804_sourceglass_mvp_design/implementation_plan.md §2.0.1
  ai_tasks/20260804_sourceglass_mvp_design/copy.md §3.5

## 結論

**Worker 化はしません。** 実測が示したのは「メインスレッドで動いていること」ではなく
「処理量が無制限であること」が欠陥だということでした。13.3 MB の通常 JPEG が 1.5 ms で
終わっているのに、より小さい 11 MB の巨大 XMP が 3 秒かかっています。
Worker に移しても仕事の量は減りません。ユーザーは同じ3秒を待ちます。

代わりに、ExifReader を呼ぶ前にメタデータ量を測って上限で切ります。

## 着手順

### 1. containerScan と上限（D-023）

- JPEG の APPn マーカー / PNG のチャンク / WebP の RIFF チャンクを、
  長さフィールドで飛ばしながら数えるだけの走査を書く
- METADATA_BYTES_LIMIT = 262_144（256 KiB）。EXIF + XMP + IPTC の合計。C2PA は含めない
- 超過したら ExifReader を呼ばず、SourceResult.error（METADATA_TOO_LARGE）にして
  coverage.failed に exif と xmp の両方を入れる
- セグメント走査ができない AVIF / HEIC は、ファイルサイズ 8 MiB を粗い代替上限にする

**この走査は copy.md §3.5 の「領域が無い」/「領域はあるが技術情報のみ」の
出し分けにも使ってください。** そのために元々必要だったものです。

**上限超過のときに emptyReason.noSegment を出さないでください。**
領域は存在しました。読まなかっただけです。この2つを混同すると
「調べた結果 何も無かった」と「調べていない」が入れ替わります。

### 2. フィクスチャを作り直す（D-028）

fixtures/ は未追跡ですが .gitignore にも入っていないため、このままだと
performance-large.jpg（13.3 MB）と broken-huge-exif.jpg（11.0 MB）が
public リポジトリの履歴に永久に残ります。git の履歴は消せません。

- broken-huge-exif を **メタデータ約 300 KB（ファイル約 320 KB）** で作り直す。
  目的は上限を超えることであり、巨大であることではありません
- performance-large.jpg は **コミットしない**
- xmp-large-within-limit（メタデータ約 250 KB）を追加する

### 3. 上限のすぐ内側で実測する（D-024）

256 KiB は実測からの外挿値です。裏を取ってください。

xmp-large-within-limit で **50 ms を超えたら、実装を進めずに相談してください。**
その場合は上限を下げるか、EXIF/XMP detector を Worker 化します。

### 4. MetadataReader ポート（D-025）

  export interface MetadataReader {
    read(bytes: ArrayBuffer): Promise<RawMetadata>;
  }

- 実装は inline（ExifReader を直接呼ぶ）。features/provenance/ 内に置いてください
- **timeoutMs を引数に入れないでください。** inline では同期処理を中断できず、
  受け取っても守れません。守れない約束を型に書かないでください
- METADATA_READ_TIMEOUT は定義だけしておいてください。将来 Worker 実装を
  足すときにエンジンを変えずに済みます

### 5. 自由記述値の切り詰め（D-027）

- 1値あたり 512 文字。{ truncated: true, originalLength: n } を持たせる
- 配列は最大 50 要素
- 切り詰めた事実を UI に出す（copy.md の value.truncated）。原文は保持しない

### 6. 型 → detector → rules

UI は書かないでください。Phase 2 の既存の完了条件（D-011 / D-016 の検証）も
そのまま有効です。

## 完了条件

  npm run typecheck && npm run lint && npm run test && npm run design:guard && npm run build

加えて:

- xmp-large-within-limit の実測値（50 ms 以下であること）
- broken-huge-exif が METADATA_TOO_LARGE で coverage.failed に入る
- remote-only fixture で外部リクエストが 0 件（D-011）
- adobe-20220124-E-uri-CA.jpg で integrity === 'invalid' になり、
  C2PA 由来シグナルが explicit にならない（D-016）
- 公式テストファイルで signerTrust === 'not-evaluated' になる
- fixtures/ に 1 MB を超えるファイルが無い

## 報告

Phase 3 には自動で進まないでください。終わったら、完了条件それぞれの結果と、
上限内での実測値を報告してください。
```

---

## Phase 3 以降でスコープを差し替えるときの雛形

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
