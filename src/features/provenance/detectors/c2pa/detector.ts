import type { C2paSdk, Reader } from "@contentauth/c2pa-web";

import type {
  AnalysisInput,
  C2paData,
  Detector,
  SourceResult,
} from "../../types";
import { getC2paSdk } from "./client";
import { c2paError } from "./errors";
import { normalizeC2paStore } from "./normalize";

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

export const c2paDetector: Detector<C2paData> = {
  id: "c2pa",
  kind: "metadata",
  needs: ["bytes"],
  supports(input: AnalysisInput) {
    return SUPPORTED_MIME_TYPES.has(input.file.mimeType.toLowerCase());
  },
  async run(input): Promise<SourceResult<C2paData>> {
    let reader: Reader | null = null;
    let result: SourceResult<C2paData>;
    let bytes: ArrayBuffer;
    try {
      bytes = await input.bytes();
    } catch (error) {
      return { status: "error", error: c2paError("C2PA_READ_FAILED", error) };
    }

    if (bytes.byteLength === 0) {
      return {
        status: "error",
        error: c2paError(
          "C2PA_UNSUPPORTED_TYPE",
          new Error("The image is empty."),
        ),
      };
    }

    let sdk: C2paSdk;
    try {
      sdk = await getC2paSdk();
    } catch (error) {
      return { status: "error", error: c2paError("C2PA_READ_FAILED", error) };
    }

    try {
      reader = await sdk.reader.fromBlob(
        input.file.mimeType,
        new Blob([bytes], { type: input.file.mimeType }),
      );
      result =
        reader === null
          ? { status: "absent" }
          : {
              status: "present",
              data: normalizeC2paStore(await reader.manifestStore()),
            };
    } catch (error) {
      result = {
        status: "error",
        error: c2paError("C2PA_INVALID_ASSET", error),
      };
    } finally {
      if (reader !== null) {
        try {
          await reader.free();
        } catch (error) {
          result = {
            status: "error",
            error: c2paError("C2PA_READ_FAILED", error),
          };
        }
      }
    }

    return result;
  },
};
