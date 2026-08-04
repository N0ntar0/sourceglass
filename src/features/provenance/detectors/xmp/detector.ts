import { prepareMetadata } from "../metadata/prepare";
import { normalizeMetadataGroups } from "../metadata/normalize";
import type {
  AnalysisInput,
  Detector,
  SourceResult,
  XmpData,
} from "../../types";

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

export const xmpDetector: Detector<XmpData> = {
  id: "xmp",
  kind: "metadata",
  needs: ["bytes"],
  supports(input: AnalysisInput) {
    return SUPPORTED_MIME_TYPES.has(input.file.mimeType.toLowerCase());
  },
  async run(input): Promise<SourceResult<XmpData>> {
    const prepared = await prepareMetadata(input);
    if (prepared.status === "error") {
      return {
        status: "error",
        error: { code: prepared.code, message: prepared.message },
      };
    }

    if (prepared.scan.hasXmp === false) return { status: "absent" };
    const fields = normalizeMetadataGroups([
      { name: "xmp", value: prepared.raw.xmp },
    ]);
    if (Object.keys(fields).length === 0) return { status: "absent" };

    return {
      status: "present",
      data: { fields, entryCount: Object.keys(fields).length },
    };
  },
};
