import type { JsonValue } from "../../types";
import type { C2paRule, RuleEvidence } from "../../rules/types";
import {
  COMPOSITE_WITH_TRAINED_ALGORITHMIC_MEDIA,
  TRAINED_ALGORITHMIC_MEDIA,
} from "../../rules/vocab";

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValues(value: JsonValue | undefined): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => stringValues(item));
  return [];
}

function actionEvidence(sourceType: string): C2paRule["match"] {
  return (input) => {
    const evidence: RuleEvidence[] = [];

    for (const [manifestLabel, manifest] of Object.entries(input.manifests)) {
      manifest.assertions.forEach((assertion, assertionIndex) => {
        if (
          !assertion.label.startsWith("c2pa.actions") ||
          !isRecord(assertion.data)
        )
          return;
        const actions = assertion.data.actions;
        if (!Array.isArray(actions)) return;

        actions.forEach((action, actionIndex) => {
          if (!isRecord(action) || action.digitalSourceType !== sourceType)
            return;
          evidence.push({
            path: `c2pa.manifests.${manifestLabel}.assertions[${assertionIndex}].actions[${actionIndex}].digitalSourceType`,
            value: sourceType,
          });
        });
      });
    }

    return evidence;
  };
}

function findDigitalSourceTypes(
  value: JsonValue,
  path: string,
): RuleEvidence[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findDigitalSourceTypes(item, `${path}[${index}]`),
    );
  }
  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, item]) => {
    const itemPath = `${path}.${key}`;
    if (key.toLowerCase().endsWith("digitalsourcetype")) {
      return stringValues(item).flatMap((sourceType) =>
        sourceType === TRAINED_ALGORITHMIC_MEDIA ||
        sourceType === COMPOSITE_WITH_TRAINED_ALGORITHMIC_MEDIA
          ? [{ path: itemPath, value: sourceType }]
          : [],
      );
    }
    return findDigitalSourceTypes(item, itemPath);
  });
}

export const C2PA_RULES: readonly C2paRule[] = [
  {
    id: "c2pa.dst.trainedAlgorithmicMedia",
    source: "c2pa",
    category: "ai-generation",
    basis: "explicit",
    labelKey: "signal.c2pa.trainedAlgorithmicMedia",
    match: actionEvidence(TRAINED_ALGORITHMIC_MEDIA),
  },
  {
    id: "c2pa.dst.compositeWithTrainedAlgorithmicMedia",
    source: "c2pa",
    category: "ai-editing",
    basis: "explicit",
    labelKey: "signal.c2pa.compositeWithTrainedAlgorithmicMedia",
    match: actionEvidence(COMPOSITE_WITH_TRAINED_ALGORITHMIC_MEDIA),
  },
  {
    id: "c2pa.iptc.digitalSourceType",
    source: "c2pa",
    category: "ai-generation",
    basis: "explicit",
    labelKey: "signal.c2pa.iptcDigitalSourceType",
    match(input) {
      return Object.entries(input.manifests).flatMap(
        ([manifestLabel, manifest]) =>
          manifest.assertions.flatMap((assertion, assertionIndex) =>
            assertion.label === "stds.iptc.photo-metadata"
              ? findDigitalSourceTypes(
                  assertion.data,
                  `c2pa.manifests.${manifestLabel}.assertions[${assertionIndex}]`,
                )
              : [],
          ),
      );
    },
  },
];
