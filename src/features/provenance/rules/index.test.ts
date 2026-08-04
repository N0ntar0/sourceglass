import { describe, expect, it } from "vitest";

import { normalizeC2paStore } from "../detectors/c2pa/normalize";
import { evaluate } from ".";
import type { C2paData, SourceResult } from "../types";
import { ALGORITHMIC_MEDIA, TRAINED_ALGORITHMIC_MEDIA } from "./vocab";

function c2paResult(data: C2paData): Record<string, SourceResult<unknown>> {
  return {
    c2pa: { status: "present", data },
    exif: { status: "absent" },
    xmp: { status: "absent" },
  };
}

function c2paData(
  sourceTypes: string[],
  state: "Valid" | "Invalid" = "Valid",
): C2paData {
  return normalizeC2paStore({
    active_manifest: "active",
    manifests: {
      active: { assertions: [] },
      older: {
        assertions: [
          {
            label: "c2pa.actions.v2",
            data: {
              actions: sourceTypes.map((digitalSourceType) => ({
                action: "c2pa.edited",
                digitalSourceType,
              })),
            },
          },
        ],
      },
    },
    validation_state: state,
    validation_results: { activeManifest: { failure: [] } },
  });
}

describe("rule evaluation", () => {
  it("does not classify algorithmicMedia as AI-related", () => {
    const evaluation = evaluate(c2paResult(c2paData([ALGORITHMIC_MEDIA])));
    expect(evaluation.verdict).toBe("NO_AI_RELATED_PROVENANCE_FOUND");
    expect(evaluation.signals).toEqual([]);
  });

  it("scans every manifest and every action", () => {
    const evaluation = evaluate(
      c2paResult(c2paData([ALGORITHMIC_MEDIA, TRAINED_ALGORITHMIC_MEDIA])),
    );
    expect(evaluation.verdict).toBe("AI_RELATED_PROVENANCE");
    expect(evaluation.basis).toBe("explicit");
    expect(evaluation.signals[0]?.evidence.path).toContain("manifests.older");
    expect(evaluation.signals[0]?.evidence.path).toContain("actions[1]");
  });

  it("demotes signals from an invalid manifest to heuristic", () => {
    const evaluation = evaluate(
      c2paResult(c2paData([TRAINED_ALGORITHMIC_MEDIA], "Invalid")),
    );
    expect(evaluation.verdict).toBe("AI_RELATED_PROVENANCE");
    expect(evaluation.basis).toBe("heuristic");
    expect(
      evaluation.signals.every((signal) => signal.basis !== "explicit"),
    ).toBe(true);
  });

  it("separates integrity from signer trust", () => {
    const normalized = normalizeC2paStore({
      manifests: { active: { assertions: [] } },
      validation_state: "Valid",
      validation_results: {
        activeManifest: {
          failure: [
            {
              code: "signingCredential.untrusted",
              explanation: "certificate untrusted",
            },
          ],
        },
      },
    });
    expect(normalized.validation.integrity).toBe("valid");
    expect(normalized.validation.signerTrust).toBe("not-evaluated");
    expect(normalized.validation.failures[0]?.code).toBe(
      "signingCredential.untrusted",
    );

    const trustedState = normalizeC2paStore({
      manifests: { active: { assertions: [] } },
      validation_state: "Trusted",
    });
    expect(trustedState.validation.integrity).toBe("valid");
    expect(trustedState.validation.signerTrust).toBe("not-evaluated");
  });
});
