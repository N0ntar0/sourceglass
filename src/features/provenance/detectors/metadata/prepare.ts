import { containerScan, type ContainerScan } from "../../engine/containerScan";
import { inlineMetadataReader } from "../../ports/metadataReader.inline";
import type { MetadataReader, RawMetadata } from "../../ports/metadataReader";
import type { AnalysisInput, MetadataErrorCode } from "../../types";

export type MetadataPreparation =
  | { status: "ready"; scan: ContainerScan; raw: RawMetadata }
  | { status: "error"; code: MetadataErrorCode; message: string };

const preparationCache = new WeakMap<
  AnalysisInput,
  Promise<MetadataPreparation>
>();

async function prepare(
  input: AnalysisInput,
  reader: MetadataReader,
): Promise<MetadataPreparation> {
  let bytes: ArrayBuffer;
  try {
    bytes = await input.bytes();
  } catch (error) {
    return {
      status: "error",
      code: "CONTAINER_UNREADABLE",
      message:
        error instanceof Error ? error.message : "Unable to read image bytes.",
    };
  }

  const scanResult = containerScan(bytes, input.file.mimeType);
  if (scanResult.status === "error") {
    return {
      status: "error",
      code: scanResult.error.code,
      message: scanResult.error.message,
    };
  }

  try {
    return {
      status: "ready",
      scan: scanResult.scan,
      raw: await reader.read(bytes),
    };
  } catch (error) {
    return {
      status: "error",
      code: "METADATA_PARSE_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "ExifReader could not parse the metadata.",
    };
  }
}

export function prepareMetadata(
  input: AnalysisInput,
  reader: MetadataReader = inlineMetadataReader,
): Promise<MetadataPreparation> {
  const cached = preparationCache.get(input);
  if (cached !== undefined) return cached;

  const pending = prepare(input, reader);
  preparationCache.set(input, pending);
  return pending;
}
