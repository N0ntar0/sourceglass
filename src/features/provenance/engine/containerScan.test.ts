import { describe, expect, it } from "vitest";

import { fixtureInput } from "../testing/fixtureInput";
import { containerScan, METADATA_BYTES_LIMIT } from "./containerScan";

async function scan(name: string, mimeType = "image/jpeg") {
  const input = await fixtureInput(name, mimeType);
  return containerScan(await input.bytes(), mimeType);
}

function writeAscii(bytes: Uint8Array, offset: number, value: string): void {
  for (const [index, character] of [...value].entries()) {
    bytes[offset + index] = character.charCodeAt(0);
  }
}

function pngWithChunk(type: string, length: number): ArrayBuffer {
  const bytes = new Uint8Array(8 + 12 + length);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  new DataView(bytes.buffer).setUint32(8, length, false);
  writeAscii(bytes, 12, type);
  return bytes.buffer;
}

function webpWithChunk(type: string, length: number): ArrayBuffer {
  const paddedLength = length + (length % 2);
  const bytes = new Uint8Array(20 + paddedLength);
  writeAscii(bytes, 0, "RIFF");
  new DataView(bytes.buffer).setUint32(4, bytes.byteLength - 8, true);
  writeAscii(bytes, 8, "WEBP");
  writeAscii(bytes, 12, type);
  new DataView(bytes.buffer).setUint32(16, length, true);
  return bytes.buffer;
}

describe("containerScan", () => {
  it("rejects metadata above the fixed limit before ExifReader", async () => {
    const result = await scan("broken-huge-exif.jpg");
    expect(result).toEqual({
      status: "error",
      error: {
        code: "METADATA_TOO_LARGE",
        message: `Metadata exceeds the ${METADATA_BYTES_LIMIT}-byte limit.`,
      },
    });
  });

  it("counts a large JPEG ICC profile toward the metadata limit", async () => {
    const result = await scan("huge-icc.jpg");
    expect(result).toEqual({
      status: "error",
      error: {
        code: "METADATA_TOO_LARGE",
        message: `Metadata exceeds the ${METADATA_BYTES_LIMIT}-byte limit.`,
      },
    });
  });

  it("accepts the XMP fixture immediately below the limit", async () => {
    const result = await scan("xmp-large-within-limit.jpg");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.scan.hasXmp).toBe(true);
    expect(result.scan.metadataBytes).toBeLessThanOrEqual(METADATA_BYTES_LIMIT);
  });

  it("distinguishes an EXIF segment from no metadata segment", async () => {
    const technical = await scan("exif-technical-only.jpg");
    const empty = await scan("no-metadata.jpg");
    expect(technical.status === "ok" && technical.scan.hasExif).toBe(true);
    expect(empty.status === "ok" && empty.scan.hasExif).toBe(false);
    expect(empty.status === "ok" && empty.scan.hasXmp).toBe(false);
  });

  it.each([
    ["png-exif.png", "image/png", "hasExif"],
    ["png-xmp.png", "image/png", "hasXmp"],
    ["webp-exif.webp", "image/webp", "hasExif"],
    ["webp-xmp.webp", "image/webp", "hasXmp"],
  ] as const)("finds %s metadata", async (name, mimeType, flag) => {
    const result = await scan(name, mimeType);
    expect(result.status === "ok" && result.scan[flag]).toBe(true);
  });

  it.each(["iTXt", "tEXt", "zTXt", "iCCP"])(
    "counts PNG %s chunks handled by ExifReader",
    (type) => {
      const result = containerScan(pngWithChunk(type, 128), "image/png");
      expect(result.status === "ok" && result.scan.metadataBytes).toBe(128);
    },
  );

  it("counts WebP ICCP chunks handled by ExifReader", () => {
    const result = containerScan(webpWithChunk("ICCP", 128), "image/webp");
    expect(result.status === "ok" && result.scan.metadataBytes).toBe(128);
  });
});
