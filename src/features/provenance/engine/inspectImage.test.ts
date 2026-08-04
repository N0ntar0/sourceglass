import { describe, expect, it } from "vitest";

import { inspectImage } from "..";
import { fixtureInput } from "../testing/fixtureInput";

const METADATA_ONLY = { only: ["exif", "xmp"] };

describe("inspectImage metadata path", () => {
  it("returns explicit AI-related provenance for IPTC XMP", async () => {
    const report = await inspectImage(
      await fixtureInput("xmp-ai-dst.jpg"),
      METADATA_ONLY,
    );
    expect(report.verdict).toBe("AI_RELATED_PROVENANCE");
    expect(report.basis).toBe("explicit");
    expect(report.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "xmp.iptc.digitalSourceType",
          source: "xmp",
        }),
      ]),
    );
  });

  it("keeps software-name evidence heuristic", async () => {
    const report = await inspectImage(
      await fixtureInput("exif-software-aitool.jpg"),
      METADATA_ONLY,
    );
    expect(report.verdict).toBe("AI_RELATED_PROVENANCE");
    expect(report.basis).toBe("heuristic");
  });

  it("keeps XMP creator-tool evidence heuristic", async () => {
    const report = await inspectImage(
      await fixtureInput("xmp-creator-aitool.jpg"),
      METADATA_ONLY,
    );
    expect(report.verdict).toBe("AI_RELATED_PROVENANCE");
    expect(report.basis).toBe("heuristic");
    expect(report.signals[0]?.id).toBe("xmp.creatorTool.aiTool");
  });

  it("returns no AI-related record only for meaningful provenance", async () => {
    const report = await inspectImage(
      await fixtureInput("exif-rich-no-c2pa.jpg"),
      METADATA_ONLY,
    );
    expect(report.verdict).toBe("NO_AI_RELATED_PROVENANCE_FOUND");
    expect(report.coverage.withMeaningfulData).toEqual(["exif"]);
  });

  it("does not treat technical EXIF as meaningful provenance", async () => {
    const report = await inspectImage(
      await fixtureInput("exif-technical-only.jpg"),
      METADATA_ONLY,
    );
    expect(report.verdict).toBe("NO_PROVENANCE_INFORMATION");
    expect(report.results.exif?.status).toBe("present");
    expect(report.coverage.withMeaningfulData).toEqual([]);
  });

  it("distinguishes a file with no metadata segment", async () => {
    const report = await inspectImage(
      await fixtureInput("no-metadata.jpg"),
      METADATA_ONLY,
    );
    expect(report.verdict).toBe("NO_PROVENANCE_INFORMATION");
    expect(report.results.exif).toEqual({ status: "absent" });
    expect(report.results.xmp).toEqual({ status: "absent" });
    expect(report.results.c2pa).toEqual({
      status: "not-checked",
      reason: "not-requested",
    });
  });

  it("fails EXIF and XMP without parsing metadata above the limit", async () => {
    const report = await inspectImage(
      await fixtureInput("broken-huge-exif.jpg"),
      METADATA_ONLY,
    );
    expect(report.coverage.failed).toEqual(["exif", "xmp"]);
    expect(report.results.exif).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({ code: "METADATA_TOO_LARGE" }),
      }),
    );
    expect(report.results.xmp).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({ code: "METADATA_TOO_LARGE" }),
      }),
    );
  });

  it("rejects a huge ICC profile before ExifReader", async () => {
    const report = await inspectImage(
      await fixtureInput("huge-icc.jpg"),
      METADATA_ONLY,
    );
    expect(report.coverage.failed).toEqual(["exif", "xmp"]);
    expect(report.results.exif).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({ code: "METADATA_TOO_LARGE" }),
      }),
    );
    expect(report.results.xmp).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({ code: "METADATA_TOO_LARGE" }),
      }),
    );
  });

  it("returns errors rather than throwing for a non-image", async () => {
    const report = await inspectImage(
      await fixtureInput("broken-not-image.jpg"),
      METADATA_ONLY,
    );
    expect(report.coverage.failed).toEqual(["exif", "xmp"]);
    expect(report.results.exif).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({ code: "CONTAINER_UNREADABLE" }),
      }),
    );
  });

  it.each(["broken-truncated.jpg", "broken-zero-byte.jpg"])(
    "returns metadata errors for %s",
    async (name) => {
      const report = await inspectImage(
        await fixtureInput(name),
        METADATA_ONLY,
      );
      expect(report.coverage.failed).toEqual(["exif", "xmp"]);
      expect(report.results.exif?.status).toBe("error");
      expect(report.results.xmp?.status).toBe("error");
    },
  );

  it.each([
    ["png-exif.png", "image/png", "exif"],
    ["png-xmp.png", "image/png", "xmp"],
    ["webp-exif.webp", "image/webp", "exif"],
    ["webp-xmp.webp", "image/webp", "xmp"],
    ["avif-exif.avif", "image/avif", "exif"],
  ] as const)("reads %s", async (name, mimeType, meaningfulSource) => {
    const report = await inspectImage(
      await fixtureInput(name, mimeType),
      METADATA_ONLY,
    );
    expect(report.verdict).toBe("NO_AI_RELATED_PROVENANCE_FOUND");
    expect(report.coverage.withMeaningfulData).toContain(meaningfulSource);
  });

  it("truncates free text and remains structured-clone compatible", async () => {
    const report = await inspectImage(
      await fixtureInput("xmp-large-within-limit.jpg"),
      METADATA_ONLY,
    );
    const xmp = report.results.xmp;
    expect(xmp?.status).toBe("present");
    if (xmp?.status !== "present") return;
    const data = xmp.data as {
      fields: Record<
        string,
        {
          values: Array<{
            value: string;
            truncated: boolean;
            originalLength: number;
          }>;
        }
      >;
    };
    const description = data.fields["xmp.description"]?.values[0];
    expect(description?.value).toHaveLength(512);
    expect(description?.truncated).toBe(true);
    expect(description?.originalLength).toBe(245_000);
    expect(() => structuredClone(report)).not.toThrow();
  });
});
