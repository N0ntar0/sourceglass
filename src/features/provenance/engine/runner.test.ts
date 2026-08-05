import { describe, expect, it } from "vitest";

import type { AnalysisInput, Detector } from "../types";
import { runDetectors } from "./runner";

const input: AnalysisInput = {
  file: { name: "fixture.bin", size: 1, mimeType: "application/octet-stream" },
  async bytes() {
    return new ArrayBuffer(1);
  },
  async pixels() {
    throw new Error("Pixel decoding is unavailable in this test.");
  },
};

function detector(
  id: string,
  options: { deferred?: boolean; supported?: boolean } = {},
): Detector {
  return {
    id,
    kind: "metadata",
    needs: ["bytes"],
    deferred: options.deferred,
    supports: () => options.supported !== false,
    async run() {
      return { status: "absent" };
    },
  };
}

describe("runDetectors", () => {
  it("keeps unsupported and not-requested detectors distinct from absent", async () => {
    const output = await runDetectors(input, [
      detector("unsupported", { supported: false }),
      detector("deferred", { deferred: true }),
      detector("ran"),
    ]);

    expect(output.results).toEqual({
      unsupported: { status: "not-checked", reason: "unsupported" },
      deferred: { status: "not-checked", reason: "not-requested" },
      ran: { status: "absent" },
    });
    expect(output.coverage.ran).toEqual(["ran"]);
    expect(output.coverage.skipped).toEqual([
      { id: "unsupported", reason: "unsupported" },
      { id: "deferred", reason: "not-requested" },
    ]);
  });
});
