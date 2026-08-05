import type { TranslationKey } from "./en";

export const ja: Record<TranslationKey, string> = {
  "app.name": "Sourceglass",
  "app.tagline": "画像に残された来歴情報を調べます。",
  "dropzone.primary": "ここに画像をドロップ",
  "dropzone.or": "または",
  "dropzone.button": "画像を選択",
  "privacy.badge": "画像はブラウザの外に出ません",
  "file.metadata": "{name} · {size} bytes",
  "disclaimer.always":
    "Sourceglass は、画像に記録された情報を読み取るだけのツールです。",
  "result.noAi.heading": "AI生成を示す記録は見つかりませんでした",
  "result.noAi.note":
    "これは「AIを使っていない」という意味ではありません。この種の記録は、画像を保存し直すだけで簡単に消えます。",
  "result.none.heading": "来歴の記録が残っていませんでした",
  "result.none.note":
    "よくあることです。SNSに投稿された画像やスクリーンショットでは、ほとんどの記録が失われます。この画像については、何も判断できません。",
  "result.ai.explicit.heading": "AI生成・AI編集を示す記録が見つかりました",
  "result.ai.explicit.note":
    "C2PA の正式な来歴情報に基づく検出です。ただし、記録の内容そのものが正しいことまでは保証しません。",
  "result.ai.heuristic.heading": "AIツールに関する記述が見つかりました",
  "result.ai.heuristic.note":
    "メタデータの Software 欄などに書かれていたものです。C2PA のように検証された情報ではなく、書き換えも可能です。",
  "result.ai.tampered.note":
    "ただし、この C2PA 記録は整合性チェックに失敗しています。記録された内容は信頼できません。",
  "integrity.invalid":
    "この画像の C2PA 記録は、内容の整合性チェックに失敗しました。記録された内容は信頼できません。",
  "trust.notEvaluated": "署名者の信頼性は評価していません。",
  "coverage.checked": "調べたもの: {list}",
  "coverage.failed": "読み取れなかったもの: {list}",
  "coverage.skipped": "この形式では調べられないもの: {list}",
  "whyEmpty.heading": "メタデータが失われる主な場面",
  "whyEmpty.item.social": "SNS やメッセージアプリへの投稿・転送",
  "whyEmpty.item.screenshot": "スクリーンショットの撮影",
  "whyEmpty.item.export": "画像編集ソフトでの書き出し・リサイズ",
  "whyEmpty.item.resave": "「画像を保存」での再エンコード",
  "emptyReason.noSegment":
    "このファイルには EXIF / XMP / C2PA の領域が存在しません",
  "emptyReason.technicalOnly":
    "EXIF は {n} 項目ありますが、すべて画像の技術情報です",
  "emptyReason.tooLarge":
    "メタデータ領域が大きすぎるため、読み取りを中止しました（上限 {limit}）。",
  "emptyReason.notChecked": "この形式は解析できないため、調べていません。",
  "value.truncated": "(truncated, {n} characters total)",
  "section.provenance": "Provenance Check",
  "section.result": "Result",
  "summary.c2pa": "C2PA",
  "summary.aiRelated": "AI関連の来歴",
  "summary.software": "Software",
  "summary.exif": "EXIF",
  "summary.xmp": "XMP",
  "summary.found": "検出",
  "summary.empty": "—",
  "summary.entries": "{n}項目",
  "details.c2pa": "C2PA Details",
  "details.exif": "EXIF Details",
  "details.xmp": "XMP Details",
  "details.field": "Field",
  "details.value": "Value",
  "details.evidence": "Evidence",
  "status.absent": "absent",
  "status.notChecked": "not checked",
  "status.error": "error",
};
