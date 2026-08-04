# Last Updated: 2026-08-04 23:10

# Sourceglass 文言仕様（i18n 辞書の確定版）

**この文言はプロダクトの設計思想そのものである。CodeX は勝手に言い換えないこと。**
変更が必要だと思った場合は実装せずに相談すること。

---

## 0. 文言の設計原則

1. **否定形を重ねない。** 「検出されなかったことは〜でないことを証明しない」は否定が3つ入り、
   まず読まれない。**読まれない正確さは、誤解防止の役に立たない。**
   → 常時表示は**肯定文1行**にし、結果ごとに「これが意味しないこと」を**1文だけ**添える。
2. **主語をツールではなく画像に置く。**
   「（ツールが）検出しませんでした」ではなく「（画像に）記録が見つかりませんでした」。
   前者はツールが検査して OK を出したという含意を生む。
3. **AI 側に振れた時も断定しない。** C2PA も偽装されうる。
   「見つかった」時だけ断定調になるのは非対称で不誠実。
4. **`✓` と緑を使わない。** 記号と色は文言より速く強く伝わる。
   チェックマークと緑は UI 文脈では「合格・安全」を意味し、免責文言と矛盾する。
   → 中立記号（`—` / `ⓘ`）＋ニュートラル配色。**色を使うのは AI 関連が見つかった時だけ。**

---

## 1. 常時表示（結果画面に必ず出す・折りたためない）

| key | ja | en |
| --- | --- | --- |
| `disclaimer.always` | Sourceglass は、画像に記録された情報を読み取るだけのツールです。 | Sourceglass only reads what is recorded in the image. |

---

## 2. 結果（verdict ごと）

見出しと注記は**必ずセットで表示**する。注記だけを折りたたむことを禁止する。

### NO_AI_RELATED_PROVENANCE_FOUND — 記号 `—` / ニュートラル配色

| key | ja | en |
| --- | --- | --- |
| `result.noAi.heading` | AI生成を示す記録は見つかりませんでした | No AI-related record was found |
| `result.noAi.note` | これは「AIを使っていない」という意味ではありません。この種の記録は、画像を保存し直すだけで簡単に消えます。 | This does not mean AI was not used. Records like these are easily removed — often just by re-saving the image. |

### NO_PROVENANCE_INFORMATION — 記号 `ⓘ` / ニュートラル配色

| key | ja | en |
| --- | --- | --- |
| `result.none.heading` | 来歴の記録が残っていませんでした | No provenance record remains |
| `result.none.note` | よくあることです。SNSに投稿された画像やスクリーンショットでは、ほとんどの記録が失われます。**この画像については、何も判断できません。** | This is common. Most records are stripped when an image is posted online or screenshotted. **Nothing can be concluded about this image.** |

> 「何も判断できません」を濁さないこと。曖昧にすると、ユーザーは勝手に「問題なし」と解釈する。

### AI_RELATED_PROVENANCE / basis = explicit — 記号 `⚠` / **ここだけ色を使う**

| key | ja | en |
| --- | --- | --- |
| `result.ai.explicit.heading` | AI生成・AI編集を示す記録が見つかりました | A record indicating AI generation or AI editing was found |
| `result.ai.explicit.note` | C2PA の正式な来歴情報に基づく検出です。ただし、記録の内容そのものが正しいことまでは保証しません。 | Based on formal C2PA provenance data. Sourceglass does not guarantee that the record itself is truthful. |

### AI_RELATED_PROVENANCE / basis = heuristic — 記号 `⚠` / 色は explicit より弱く

| key | ja | en |
| --- | --- | --- |
| `result.ai.heuristic.heading` | AIツールに関する記述が見つかりました | A mention of an AI tool was found |
| `result.ai.heuristic.note` | メタデータの Software 欄などに書かれていたものです。C2PA のように検証された情報ではなく、書き換えも可能です。 | Found in metadata fields such as Software. This is not verified data like C2PA, and it can be edited. |

---

## 2.5 C2PA の integrity / trust（verdict とは独立に表示する）

Phase 0 の実測により、**`validation_state: "Valid"` と `signingCredential.untrusted` は
同時に成立する**ことが判明した。「検証に通った」と「発行者が信頼できる」は別の話であり、
**まとめて表示したらこの製品は嘘をつく。**

verdict を増やさず、**独立した行**として合成する（どの verdict とも共存しうる）。

### 整合性チェックに失敗した場合（`integrity === 'invalid'`）

C2PA の記録は存在するが、ハッシュや署名の照合に失敗した状態。

| key | ja | en |
| --- | --- | --- |
| `integrity.invalid` | この画像の C2PA 記録は、内容の整合性チェックに失敗しました。記録された内容は信頼できません。 | The C2PA record in this image failed its integrity checks. Its contents cannot be relied upon. |

**この場合、C2PA 由来の AI シグナルを `explicit` として扱わない**（`implementation_plan.md` D6）。
改ざん検知に失敗した記録の中身を「正式な表明」として提示できないため。

### 署名者の信頼性（MVP では常にこれ）

| key | ja | en |
| --- | --- | --- |
| `trust.notEvaluated` | 署名者の信頼性は評価していません。 | The signer's trustworthiness was not evaluated. |

**「この署名者は信頼できません」と書かないこと。**
Sourceglass が意図的にトラストリストを設定していないだけであり、
署名者を否定的に評価したわけではない。この2つはまったく違う。

生の `signingCredential.untrusted` などのコードは、**詳細タブにのみ**表示する。

---

## 3. 検査範囲（coverage）

**必ず結果の近くに出す。**「見つからなかった」は検査範囲に依存するため、
何を調べた結果なのかを示さないと意味が確定しない。v0.2 で検査項目が増えたときにそのまま効く。

| key | ja | en |
| --- | --- | --- |
| `coverage.checked` | 調べたもの: {list} | Checked: {list} |
| `coverage.failed` | 読み取れなかったもの: {list} | Could not be read: {list} |
| `coverage.skipped` | この形式では調べられないもの: {list} | Not applicable to this format: {list} |

---

## 3.5 「情報なし」画面の設計（最重要画面）

実運用で**最も高頻度**に出る画面。SNS 経由の画像・スクショ・メッセージアプリ転送はほぼ全てこれになる。

**この画面が抱える2つのリスク:**

1. 何も出ないので「ツールが失敗した」と読まれる
2. 同時に「問題なし」とも読まれる（最悪の誤読）

さらに `NO_AI_RELATED_PROVENANCE_FOUND` と意味が全く違う
（前者=何も言えない / 後者=調べた範囲では無かった）のに、
素朴に作ると**この2つが同じ見た目になる。混同が最大のリスク。**

### 対策1: 空を空のまま出さない — 「なぜ空なのか」を事実で示す

推測を一切含まずに言える事実が2種類ある。**必ず区別して表示する。**

| 状態 | 表示 |
| --- | --- |
| メタデータ領域そのものが無い | このファイルには EXIF / XMP / C2PA の領域が存在しません |
| 領域はあるが来歴の項目が無い | EXIF は {n} 項目ありますが、すべて画像の技術情報（寸法・色空間など）です |

これにより「情報なし」画面が、ツールの失敗から**最も教育的な出力**に変わる。

### 対策2: Summary の行を空白にせず `—` で埋める

空白は「調べていない」に見える。`—` は「調べた上で無かった」に見える。

### 対策3: 破線ボーダーで NO_AI_RELATED_PROVENANCE_FOUND と視覚的に分ける

- `NO_PROVENANCE_INFORMATION` → **破線**ボーダー（情報が欠落している状態の視覚化）
- `NO_AI_RELATED_PROVENANCE_FOUND` → **実線**ボーダー

記号・文言だけでなく**形でも差をつける**。

### 対策4: 「メタデータが失われる主な場面」を折りたたみで併置

一般的事実の列挙であり推測ではない。ユーザーが自力で理由に気づける。

| key | ja | en |
| --- | --- | --- |
| `whyEmpty.heading` | メタデータが失われる主な場面 | Where metadata usually gets lost |
| `whyEmpty.item.social` | SNS やメッセージアプリへの投稿・転送 | Posting or forwarding on social media and messaging apps |
| `whyEmpty.item.screenshot` | スクリーンショットの撮影 | Taking a screenshot |
| `whyEmpty.item.export` | 画像編集ソフトでの書き出し・リサイズ | Exporting or resizing in an image editor |
| `whyEmpty.item.resave` | 「画像を保存」での再エンコード | Re-encoding via "save image" |
| `emptyReason.noSegment` | このファイルには EXIF / XMP / C2PA の領域が存在しません | This file contains no EXIF, XMP, or C2PA section |
| `emptyReason.technicalOnly` | EXIF は {n} 項目ありますが、すべて画像の技術情報です | EXIF has {n} entries, but all of them are technical image data |
| `emptyReason.tooLarge` | メタデータ領域が大きすぎるため、読み取りを中止しました（上限 {limit}）。 | The metadata section was too large to read (limit {limit}). |

> **`emptyReason.tooLarge` のときに `emptyReason.noSegment` を出してはいけない。**
> 領域は存在した。読まなかっただけである。この2つを混同すると
> 「調べた結果 何も無かった」と「調べていない」が入れ替わる（`AGENTS.md` §2.4）。
> `coverage.failed`（読み取れなかったもの）を**必ず併記する**。

### 値を切り詰めたとき（D-027）

| key | ja | en |
| --- | --- | --- |
| `value.truncated` | （以下省略・全 {n} 文字） | (truncated, {n} characters total) |

**切り詰めた事実を隠さないこと。** 隠すとユーザーは「全部見た」と誤解する。

### 表示例

```
Provenance Check

  C2PA                    —
  AI関連の来歴            —
  Software                —
  EXIF                    3項目（画像の技術情報のみ）
  XMP                     —

Result
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐   ← 破線
╎ ⓘ 来歴の記録が残っていませんでした          ╎
╎                                             ╎
╎   よくあることです。SNSに投稿された画像や    ╎
╎   スクリーンショットでは、ほとんどの記録が   ╎
╎   失われます。                               ╎
╎   この画像については、何も判断できません。   ╎
╎                                             ╎
╎   調べたもの: EXIF, XMP, C2PA               ╎
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘

▾ メタデータが失われる主な場面
   ・SNS やメッセージアプリへの投稿・転送
   ・スクリーンショットの撮影
   ・画像編集ソフトでの書き出し・リサイズ
   ・「画像を保存」での再エンコード

※ Sourceglass は、画像に記録された情報を読み取るだけのツールです。
```

---

## 4. トップ画面

| key | ja | en |
| --- | --- | --- |
| `app.name` | Sourceglass | Sourceglass |
| `app.tagline` | 画像に残された来歴情報を調べます。 | Inspect the provenance of an image. |
| `dropzone.primary` | ここに画像をドロップ | Drop an image here |
| `dropzone.or` | または | or |
| `dropzone.button` | 画像を選択 | Select Image |
| `privacy.badge` | 画像はブラウザの外に出ません | Your images never leave your browser |

---

## 5. 表示例（NO_AI_RELATED_PROVENANCE_FOUND）

```
Provenance Check

  C2PA                    検出
  AI関連の来歴            なし
  Software                CLIP STUDIO PAINT
  EXIF                    検出
  XMP                     検出

Result

  —  AI生成を示す記録は見つかりませんでした
     これは「AIを使っていない」という意味ではありません。
     この種の記録は、画像を保存し直すだけで簡単に消えます。

  調べたもの: EXIF, XMP, C2PA

  ※ Sourceglass は、画像に記録された情報を読み取るだけのツールです。

▸ C2PA Details
▸ EXIF Details
▸ XMP Details
```

---

## 6. README に載せる正確版（UI では使わない）

UI からは二重否定の文を外したが、**仕様上の担保として README には正確な形も残す。**

> The absence of AI-related provenance does not prove that an image was not generated or
> edited using AI.
>
> AI関連の来歴情報が検出されなかったことは、その画像がAIによって生成・編集されていない
> ことを証明するものではありません。

---

## 7. 禁止語（製品名・機能名・UI 文言のすべてで）

| 禁止 | 理由 |
| --- | --- |
| `Proof` / `Verify` / `Authentic` / `Proven` | 「証明した」と読まれる |
| `Detect`（AI検出の意味で） | AI 検出器だと誤解される。メタデータの「検出」には `found` を使う |
| 「安全」「問題なし」「クリーン」 | 判定していないものを判定したことになる |
| `%` を伴うあらゆる表現 | 確率表示の禁止（設計の根幹） |
