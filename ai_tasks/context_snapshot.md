# Last Updated: 2026-08-05 12:10

> このファイルは**現在地だけ**を書く。過去は残さない。60行以内に保つ。
> 決定の履歴は [`decisions.md`](./decisions.md)、読み方は [`README.md`](./README.md)。

## Current Topic

Sourceglass — **ExifReader 実測の設計レビュー完了（D-022〜D-028）。Phase 2 を再開してよい。**

- 作業ブランチ: `feature/phase2-provenance-engine`
- 実測記録: [`20260805_sourceglass_phase2/measurement.md`](./20260805_sourceglass_phase2/measurement.md)

## Working Agreement

- 実装担当は、意味のある検証済み単位で `git commit` を実行してよい
- `git push` はユーザーが実行する。push に適したタイミングを報告する
- 設計判断が必要になったら、設計担当へそのまま渡せるプロンプトを作成する

## Last Actions

- D-019 / D-020 の境界を実装し、lint が実際に落ちることを確認済み
- `fixtures.md` のフィクスチャを生成し、出典・ライセンス・SHA-256 を記録
- ExifReader 4.41.3 を実測 → **遅いのはファイルサイズではなくメタデータ量**と判明
  - 通常 13.3 MB JPEG: 0.1〜1.5 ms / 巨大 XMP 11.0 MB JPEG: 2,856〜3,765 ms
- 設計レビュー完了。**Worker 化はしない。上限で処理量を縛る**（D-022〜D-028）

## Next Step

**Phase 2 を再開する。着手順は次のとおり。**

1. **`containerScan` と上限を先に入れる**（D-023）
   - JPEG APPn / PNG チャンク / WebP RIFF を走査し、合計メタデータバイト数を出す
   - `METADATA_BYTES_LIMIT = 262_144`（256 KiB）超過なら ExifReader を呼ばない
   - 走査結果は `copy.md` §3.5 の「領域が無い」/「技術情報のみ」の出し分けにも使う
2. **フィクスチャを作り直す**（D-028）
   - `broken-huge-exif` を約 320 KB に、`performance-large.jpg` はコミットしない
   - `xmp-large-within-limit`（メタデータ約 250 KB）を追加する
3. **上限のすぐ内側で実測する**（D-024）
   - 50 ms を超えたら実装を進めず相談する。256 KiB は外挿値なので裏を取る
4. `MetadataReader` ポートを定義し、実装は inline（D-025）
5. 型 → detector → rules の順に実装。**UI は書かない**

## Resume Prompt

Sourceglass の Phase 2 再開です。`AGENTS.md` → `ai_tasks/README.md` →
`ai_tasks/decisions.md`（特に D-022〜D-028）→ `implementation_plan.md` §2.0.1 の順に読んでください。
ExifReader の実測レビューは完了し、**Worker 化はせず上限で縛る**方針が確定しています。
再検討せず、containerScan と上限 → フィクスチャ作り直し → 上限内での実測 → エンジン実装、
の順で進めてください。
