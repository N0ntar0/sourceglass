import { DETECTORS } from "./engine/registry";
import { runDetectors } from "./engine/runner";
import { evaluate } from "./rules";
import type { AnalysisInput, ProvenanceReport } from "./types";

export * from "./selectors";
export type * from "./types";

const ENGINE_VERSION = "0.1.0";

export async function inspectImage(
  input: AnalysisInput,
  options?: { only?: string[] },
): Promise<ProvenanceReport> {
  const { results, coverage } = await runDetectors(input, DETECTORS, options);
  const evaluation = evaluate(results);
  coverage.withMeaningfulData = evaluation.withMeaningfulData;

  return {
    file: { ...input.file },
    results,
    coverage,
    signals: evaluation.signals,
    verdict: evaluation.verdict,
    basis: evaluation.basis,
    analyzedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}
