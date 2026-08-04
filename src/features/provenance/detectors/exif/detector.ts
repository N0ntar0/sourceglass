import { prepareMetadata } from "../metadata/prepare";
import { normalizeMetadataGroups } from "../metadata/normalize";
import type {
  AnalysisInput,
  Detector,
  ExifData,
  SourceResult,
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

export const exifDetector: Detector<ExifData> = {
  id: "exif",
  kind: "metadata",
  needs: ["bytes"],
  supports(input: AnalysisInput) {
    return SUPPORTED_MIME_TYPES.has(input.file.mimeType.toLowerCase());
  },
  async run(input): Promise<SourceResult<ExifData>> {
    const prepared = await prepareMetadata(input);
    if (prepared.status === "error") {
      return {
        status: "error",
        error: { code: prepared.code, message: prepared.message },
      };
    }

    if (prepared.scan.hasExif === false && prepared.scan.hasIptc === false) {
      return { status: "absent" };
    }

    const fields = normalizeMetadataGroups([
      { name: "exif", value: prepared.raw.exif },
      { name: "iptc", value: prepared.raw.iptc },
    ]);
    if (Object.keys(fields).length === 0) return { status: "absent" };

    return {
      status: "present",
      data: { fields, entryCount: Object.keys(fields).length },
    };
  },
};
