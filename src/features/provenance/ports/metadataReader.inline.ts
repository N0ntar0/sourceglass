import ExifReader from "exifreader";

import type { MetadataReader } from "./metadataReader";

export const inlineMetadataReader: MetadataReader = {
  async read(bytes) {
    return ExifReader.load(bytes, { expanded: true });
  },
};
