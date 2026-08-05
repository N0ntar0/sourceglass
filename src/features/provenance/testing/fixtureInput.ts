import { readFile } from "node:fs/promises";

import type { AnalysisInput } from "../types";

export async function fixtureInput(
  name: string,
  mimeType = "image/jpeg",
): Promise<AnalysisInput> {
  const url = new URL(`../../../../fixtures/${name}`, import.meta.url);
  const fileBytes = await readFile(url);
  const bytes = fileBytes.buffer.slice(
    fileBytes.byteOffset,
    fileBytes.byteOffset + fileBytes.byteLength,
  );

  return {
    file: { name, size: bytes.byteLength, mimeType },
    async bytes() {
      return bytes.slice(0);
    },
    async pixels() {
      throw new Error("Pixel decoding is not available in engine tests.");
    },
  };
}
