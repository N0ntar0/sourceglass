import type { ExpandedTags } from "exifreader";

export type RawMetadata = ExpandedTags;

export interface MetadataReader {
  read(bytes: ArrayBuffer): Promise<RawMetadata>;
}
