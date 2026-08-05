import { describe, expect, it, vi } from "vitest";

import { fixtureInput } from "../../testing/fixtureInput";
import type { MetadataReader } from "../../ports/metadataReader";
import { prepareMetadata } from "./prepare";

describe("prepareMetadata", () => {
  it("does not invoke ExifReader after the container limit is exceeded", async () => {
    const reader: MetadataReader = { read: vi.fn() };
    const result = await prepareMetadata(
      await fixtureInput("broken-huge-exif.jpg"),
      reader,
    );
    expect(result).toEqual(
      expect.objectContaining({ status: "error", code: "METADATA_TOO_LARGE" }),
    );
    expect(reader.read).not.toHaveBeenCalled();
  });

  it("shares one metadata read between EXIF and XMP preparation", async () => {
    const input = await fixtureInput("exif-rich-no-c2pa.jpg");
    const reader: MetadataReader = {
      read: vi.fn(async () => ({ exif: {} })),
    };
    await Promise.all([
      prepareMetadata(input, reader),
      prepareMetadata(input, reader),
    ]);
    expect(reader.read).toHaveBeenCalledTimes(1);
  });
});
