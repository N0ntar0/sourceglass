import { describe, expect, it } from "vitest";

import { getC2pa } from "./selectors";
import type { ProvenanceReport } from "./types";

describe("provenance selectors", () => {
  it("does not turn a missing result into absent", () => {
    const report: ProvenanceReport = {
      file: { name: "fixture.jpg", size: 1, mimeType: "image/jpeg" },
      results: {},
      coverage: {
        ran: [],
        skipped: [],
        failed: [],
        withMeaningfulData: [],
      },
      signals: [],
      verdict: "NO_PROVENANCE_INFORMATION",
      basis: null,
      analyzedAt: "2026-08-05T00:00:00.000Z",
      engineVersion: "0.1.0",
    };

    expect(getC2pa(report)).toEqual({
      status: "not-checked",
      reason: "unavailable",
    });
  });
});
