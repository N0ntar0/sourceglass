import type { Signal } from "../provenance";

export function isAiRelatedSignal(signal: Signal): boolean {
  return (
    signal.category === "ai-generation" || signal.category === "ai-editing"
  );
}
