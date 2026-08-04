import type { AnalysisInput, Coverage, Detector, SourceResult } from "../types";

interface RunOptions {
  only?: readonly string[];
}

interface RunOutput {
  results: Readonly<Record<string, SourceResult<unknown>>>;
  coverage: Coverage;
}

function unexpectedError(error: unknown): SourceResult<unknown> {
  return {
    status: "error",
    error: {
      code: "DETECTOR_FAILED",
      message:
        error instanceof Error ? error.message : "Detector execution failed.",
    },
  };
}

export async function runDetectors(
  input: AnalysisInput,
  detectors: readonly Detector[],
  options: RunOptions = {},
): Promise<RunOutput> {
  const selected = options.only === undefined ? null : new Set(options.only);
  const coverage: Coverage = {
    ran: [],
    skipped: [],
    failed: [],
    withMeaningfulData: [],
  };
  const results: Record<string, SourceResult<unknown>> = {};
  const pending: Array<{
    detector: Detector;
    promise: Promise<SourceResult<unknown>>;
  }> = [];

  for (const detector of detectors) {
    const requested =
      selected === null
        ? detector.deferred !== true
        : selected.has(detector.id);
    if (!requested) {
      coverage.skipped.push({ id: detector.id, reason: "not-requested" });
      results[detector.id] = { status: "absent" };
      continue;
    }

    let supported: boolean;
    try {
      supported = detector.supports(input);
    } catch (error) {
      results[detector.id] = unexpectedError(error);
      coverage.failed.push(detector.id);
      continue;
    }

    if (!supported) {
      coverage.skipped.push({ id: detector.id, reason: "unsupported" });
      results[detector.id] = { status: "absent" };
      continue;
    }

    pending.push({ detector, promise: detector.run(input) });
  }

  const settled = await Promise.allSettled(
    pending.map(({ promise }) => promise),
  );
  settled.forEach((outcome, index) => {
    const detector = pending[index]?.detector;
    if (detector === undefined) return;
    const result =
      outcome.status === "fulfilled"
        ? outcome.value
        : unexpectedError(outcome.reason);
    results[detector.id] = result;
    if (result.status === "error") coverage.failed.push(detector.id);
    else coverage.ran.push(detector.id);
  });

  return { results, coverage };
}
