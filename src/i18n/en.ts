export const en = {
  "app.name": "Sourceglass",
  "app.tagline": "Inspect the provenance of an image.",
  "dropzone.primary": "Drop an image here",
  "dropzone.or": "or",
  "dropzone.button": "Select Image",
  "privacy.badge": "Your images never leave your browser",
  "file.metadata": "{name} · {size} bytes",
  "disclaimer.always": "Sourceglass only reads what is recorded in the image.",
  "result.noAi.heading": "No AI-related record was found",
  "result.noAi.note":
    "This does not mean AI was not used. Records like these are easily removed — often just by re-saving the image.",
  "result.none.heading": "No provenance record remains",
  "result.none.note":
    "This is common. Most records are stripped when an image is posted online or screenshotted. Nothing can be concluded about this image.",
  "result.ai.explicit.heading":
    "A record indicating AI generation or AI editing was found",
  "result.ai.explicit.note":
    "Based on formal C2PA provenance data. Sourceglass does not guarantee that the record itself is truthful.",
  "result.ai.heuristic.heading": "A mention of an AI tool was found",
  "result.ai.heuristic.note":
    "Found in metadata fields such as Software. This is not verified data like C2PA, and it can be edited.",
  "integrity.invalid":
    "The C2PA record in this image failed its integrity checks. Its contents cannot be relied upon.",
  "trust.notEvaluated": "The signer's trustworthiness was not evaluated.",
  "coverage.checked": "Checked: {list}",
  "coverage.failed": "Could not be read: {list}",
  "coverage.skipped": "Not applicable to this format: {list}",
  "whyEmpty.heading": "Where metadata usually gets lost",
  "whyEmpty.item.social":
    "Posting or forwarding on social media and messaging apps",
  "whyEmpty.item.screenshot": "Taking a screenshot",
  "whyEmpty.item.export": "Exporting or resizing in an image editor",
  "whyEmpty.item.resave": 'Re-encoding via "save image"',
  "emptyReason.noSegment": "This file contains no EXIF, XMP, or C2PA section",
  "emptyReason.technicalOnly":
    "EXIF has {n} entries, but all of them are technical image data",
  "emptyReason.tooLarge":
    "The metadata section was too large to read (limit {limit}).",
  "emptyReason.notChecked":
    "This format cannot be inspected, so it was not checked.",
  "value.truncated": "(truncated, {n} characters total)",
  "section.provenance": "Provenance Check",
  "section.result": "Result",
  "summary.c2pa": "C2PA",
  "summary.aiRelated": "AI-related provenance",
  "summary.software": "Software",
  "summary.exif": "EXIF",
  "summary.xmp": "XMP",
  "summary.found": "Found",
  "summary.empty": "—",
  "summary.entries": "{n} entries",
  "details.c2pa": "C2PA Details",
  "details.exif": "EXIF Details",
  "details.xmp": "XMP Details",
  "details.field": "Field",
  "details.value": "Value",
  "details.evidence": "Evidence",
  "status.absent": "absent",
  "status.notChecked": "not checked",
  "status.error": "error",
} as const;

export type TranslationKey = keyof typeof en;
