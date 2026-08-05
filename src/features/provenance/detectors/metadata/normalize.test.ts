import { describe, expect, it } from "vitest";

import { normalizeMetadataGroups } from "./normalize";

describe("normalizeMetadataGroups", () => {
  it("limits each value to 512 characters and arrays to 50 items", () => {
    const fields = normalizeMetadataGroups([
      {
        name: "xmp",
        value: {
          Description: {
            value: Array.from(
              { length: 51 },
              (_, index) => `${index}-${"x".repeat(600)}`,
            ),
          },
        },
      },
    ]);
    const field = fields["xmp.Description"];
    expect(field?.values).toHaveLength(50);
    expect(field?.arrayTruncated).toBe(true);
    expect(field?.originalCount).toBe(51);
    expect(field?.values[0]?.value).toHaveLength(512);
    expect(field?.values[0]?.truncated).toBe(true);
    expect(field?.values[0]?.originalLength).toBe(602);
  });
});
