# Last Updated: 2026-08-05 11:10

# ai_tasks — 読み方と書き方

Sourceglass の設計ドキュメント置き場。**このファイルが索引。**

---

## 1. 何を知りたいときに、どれを読むか

| 知りたいこと | 読むもの |
| --- | --- |
| いま何をしているか | [`context_snapshot.md`](./context_snapshot.md) |
| **なぜそう決まったのか** | [`decisions.md`](./decisions.md) ← **決定台帳。まずここ** |
| 何を作るのか・何を作らないのか | [`20260804_sourceglass_mvp_design/task.md`](./20260804_sourceglass_mvp_design/task.md) |
| 次に何を実装するのか | [`20260804_sourceglass_mvp_design/implementation_plan.md`](./20260804_sourceglass_mvp_design/implementation_plan.md) |
| UI に何と書くのか | [`20260804_sourceglass_mvp_design/copy.md`](./20260804_sourceglass_mvp_design/copy.md) |
| どう見せるのか | [`20260804_sourceglass_mvp_design/design.md`](./20260804_sourceglass_mvp_design/design.md) |
| テスト画像をどう用意するのか | [`20260804_sourceglass_mvp_design/fixtures.md`](./20260804_sourceglass_mvp_design/fixtures.md) |
| この先どこへ向かうのか | [`20260804_sourceglass_mvp_design/roadmap.md`](./20260804_sourceglass_mvp_design/roadmap.md) |
| C2PA が実際にどう振る舞うのか | [`20260804_sourceglass_mvp_design/spike_result.md`](./20260804_sourceglass_mvp_design/spike_result.md) |
| Phase 2 の ExifReader 実測値 | [`20260805_sourceglass_phase2/measurement.md`](./20260805_sourceglass_phase2/measurement.md) |
| 実装担当にどう依頼するのか | [`20260804_sourceglass_mvp_design/codex_prompt.md`](./20260804_sourceglass_mvp_design/codex_prompt.md) |

---

## 2. ファイルの寿命

**散らかる原因は、寿命の違うものが同じ場所に混ざること。** 3種類に分けて扱う。

| 寿命 | ファイル | 扱い |
| --- | --- | --- |
| **現在地**（常に上書き） | `context_snapshot.md` | 過去を残さない。**60行以内に保つ** |
| **台帳**（追記のみ） | `decisions.md` | 決定を消さない。覆した場合は「置き換え」として追記する |
| **仕様**（改訂する） | `copy.md` / `design.md` / `fixtures.md` / `roadmap.md` / `task.md` | バージョンを跨いで生きる。改訂したら `# Last Updated:` を更新 |
| **作業記録**（凍結） | `spike_result.md` | 実測の記録。**後から書き換えない** |
| **手順**（改訂する） | `implementation_plan.md` / `codex_prompt.md` | フェーズが進むたびに更新 |

---

## 3. 新しい情報をどこに書くか

迷ったらこの順で判断する。

| 書きたいもの | 行き先 |
| --- | --- |
| 判断・選択・却下した案 | **`decisions.md` に1エントリ追記** |
| UI 文言 | `copy.md` |
| 色・余白・書体・状態の見せ方 | `design.md` |
| 実装手順・型・受け入れ基準 | `implementation_plan.md` |
| 実測値・ログ・JSON | その作業の記録ファイル（要約で済ませない） |
| 進捗 | `context_snapshot.md`（**上書き**。追記して伸ばさない） |

**やってはいけないこと:**

- `context_snapshot.md` を変更履歴にすること。伸びてきたら `decisions.md` へ逃がす
- 同じ根拠を2箇所に書くこと。**片方が必ず腐る。**
  `decisions.md` は「何を決めたか・なぜか・どこに詳細があるか」だけを持ち、
  実装の詳細は仕様側に置いてリンクする
- 決定を黙って書き換えること。覆すなら**新しいエントリとして追記**し、古い方に取り消し線を引く

---

## 4. 命名

- 作業記録のフォルダは `[YYYYMMDD]_[英名トピック]/`
- すべてのファイルの1行目は `# Last Updated: YYYY-MM-DD HH:mm`
