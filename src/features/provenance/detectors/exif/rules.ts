import type { ExifRule } from "../../rules/types";
import { isKnownAiTool } from "../../rules/vocab";

export const EXIF_RULES: readonly ExifRule[] = [
  {
    id: "exif.software.aiTool",
    source: "exif",
    category: "ai-generation",
    basis: "heuristic",
    labelKey: "signal.exif.aiTool",
    match(input) {
      const field = input.fields["exif.Software"];
      if (field === undefined) return [];
      return field.values.flatMap((value) =>
        isKnownAiTool(value.value)
          ? [{ path: "exif.Software", value: value.value }]
          : [],
      );
    },
  },
];
