import type { XmpRule } from "../../rules/types";
import { AI_DIGITAL_SOURCE_TYPES, isKnownAiTool } from "../../rules/vocab";

export const XMP_RULES: readonly XmpRule[] = [
  {
    id: "xmp.iptc.digitalSourceType",
    source: "xmp",
    category: "ai-generation",
    basis: "explicit",
    labelKey: "signal.xmp.digitalSourceType",
    match(input) {
      const field = input.fields["xmp.DigitalSourceType"];
      if (field === undefined) return [];
      return field.values.flatMap((value) =>
        AI_DIGITAL_SOURCE_TYPES.has(value.value)
          ? [{ path: "xmp.DigitalSourceType", value: value.value }]
          : [],
      );
    },
  },
  {
    id: "xmp.creatorTool.aiTool",
    source: "xmp",
    category: "ai-generation",
    basis: "heuristic",
    labelKey: "signal.xmp.aiTool",
    match(input) {
      const field = input.fields["xmp.CreatorTool"];
      if (field === undefined) return [];
      return field.values.flatMap((value) =>
        isKnownAiTool(value.value)
          ? [{ path: "xmp.CreatorTool", value: value.value }]
          : [],
      );
    },
  },
];
