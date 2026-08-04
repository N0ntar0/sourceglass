import { describe, expect, it } from "vitest";

import { fixtureInput } from "../testing/fixtureInput";
import { containerScan, METADATA_BYTES_LIMIT } from "./containerScan";

async function scan(name: string, mimeType = "image/jpeg") {
  const input = await fixtureInput(name, mimeType);
  return containerScan(await input.bytes(), mimeType);
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
});
