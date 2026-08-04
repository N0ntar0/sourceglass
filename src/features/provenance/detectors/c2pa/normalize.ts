import type {
  C2paAssertionData,
  C2paData,
  C2paManifestData,
  C2paValidation,
  JsonValue,
} from "../../types";

interface RawManifestStore {
  active_manifest?: unknown;
  manifests?: unknown;
  validation_state?: unknown;
  validation_results?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (!isRecord(value)) return String(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]),
  );
}

function normalizeAssertions(value: unknown): C2paAssertionData[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((assertion) => {
    if (!isRecord(assertion) || typeof assertion.label !== "string") return [];
    return [{ label: assertion.label, data: toJsonValue(assertion.data) }];
  });
}

function normalizeClaimGenerators(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((generator) => {
    if (!isRecord(generator) || typeof generator.name !== "string") return [];
    return [generator.name];
  });
}

function normalizeManifests(
  value: unknown,
): Readonly<Record<string, C2paManifestData>> {
  if (!isRecord(value)) return {};
  const manifests: Record<string, C2paManifestData> = {};

  for (const [label, manifest] of Object.entries(value)) {
    if (!isRecord(manifest)) continue;
    manifests[label] = {
      label,
      title: typeof manifest.title === "string" ? manifest.title : null,
      claimGenerators: normalizeClaimGenerators(manifest.claim_generator_info),
      assertions: normalizeAssertions(manifest.assertions),
    };
  }

  return manifests;
}

function rawState(value: unknown): C2paValidation["rawState"] {
  return value === "Valid" || value === "Invalid" || value === "Trusted"
    ? value
    : null;
}

function normalizeFailures(value: unknown): C2paValidation["failures"] {
  if (!isRecord(value) || !isRecord(value.activeManifest)) return [];
  const failures = value.activeManifest.failure;
  if (!Array.isArray(failures)) return [];

  return failures.flatMap((failure) => {
    if (!isRecord(failure) || typeof failure.code !== "string") return [];
    return [
      {
        code: failure.code,
        explanation:
          typeof failure.explanation === "string" ? failure.explanation : null,
      },
    ];
  });
}

function normalizeValidation(store: RawManifestStore): C2paValidation {
  const state = rawState(store.validation_state);
  return {
    integrity:
      state === "Invalid"
        ? "invalid"
        : state === "Valid" || state === "Trusted"
          ? "valid"
          : "unknown",
    signerTrust: "not-evaluated",
    rawState: state,
    failures: normalizeFailures(store.validation_results),
  };
}

export function normalizeC2paStore(store: unknown): C2paData {
  const raw: RawManifestStore = isRecord(store) ? store : {};
  return {
    activeManifest:
      typeof raw.active_manifest === "string" ? raw.active_manifest : null,
    manifests: normalizeManifests(raw.manifests),
    validation: normalizeValidation(raw),
  };
}
