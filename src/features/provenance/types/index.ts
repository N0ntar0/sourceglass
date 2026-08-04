export type Verdict =
  | "AI_RELATED_PROVENANCE"
  | "NO_AI_RELATED_PROVENANCE_FOUND"
  | "NO_PROVENANCE_INFORMATION";

export type SourceResult<T> =
  | { status: "present"; data: T }
  | { status: "absent" }
  | { status: "error"; error: { code: string; message: string } };

export type SignalCategory =
  "ai-generation" | "ai-editing" | "provenance" | "software";
export type SignalBasis = "explicit" | "heuristic";
export type SignalSource = "c2pa" | "exif" | "xmp";

export interface Signal {
  id: string;
  source: SignalSource;
  category: SignalCategory;
  basis: SignalBasis;
  labelKey: string;
  evidence: { path: string; value: string };
}

export interface AnalysisInput {
  readonly file: { name: string; size: number; mimeType: string };
  bytes(): Promise<ArrayBuffer>;
  pixels(opts?: { maxEdge?: number }): Promise<ImageData>;
}

export interface Detector<T = unknown> {
  readonly id: string;
  readonly kind: "metadata" | "watermark";
  readonly needs: ReadonlyArray<"bytes" | "pixels">;
  readonly deferred?: boolean;
  supports(input: AnalysisInput): boolean;
  run(input: AnalysisInput): Promise<SourceResult<T>>;
}

export interface Coverage {
  ran: string[];
  skipped: Array<{
    id: string;
    reason: "unsupported" | "not-requested" | "unavailable";
  }>;
  failed: string[];
  withMeaningfulData: string[];
}

export type IntegrityState = "valid" | "invalid" | "unknown";
export type SignerTrust = "trusted" | "not-trusted" | "not-evaluated";

export interface C2paValidation {
  integrity: IntegrityState;
  signerTrust: SignerTrust;
  rawState: "Valid" | "Invalid" | "Trusted" | null;
  failures: ReadonlyArray<{ code: string; explanation: string | null }>;
}

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface C2paAssertionData {
  label: string;
  data: JsonValue;
}

export interface C2paManifestData {
  label: string;
  title: string | null;
  claimGenerators: string[];
  assertions: C2paAssertionData[];
}

export interface C2paData {
  activeManifest: string | null;
  manifests: Readonly<Record<string, C2paManifestData>>;
  validation: C2paValidation;
}

export interface MetadataValue {
  value: string;
  truncated: boolean;
  originalLength: number;
}

export interface MetadataField {
  values: MetadataValue[];
  originalCount: number;
  arrayTruncated: boolean;
}

export interface ExifData {
  fields: Readonly<Record<string, MetadataField>>;
  entryCount: number;
}

export interface XmpData {
  fields: Readonly<Record<string, MetadataField>>;
  entryCount: number;
}

export type MetadataErrorCode =
  | "METADATA_TOO_LARGE"
  | "METADATA_READ_TIMEOUT"
  | "METADATA_PARSE_FAILED"
  | "CONTAINER_UNREADABLE";

export type C2paErrorCode =
  "C2PA_INVALID_ASSET" | "C2PA_UNSUPPORTED_TYPE" | "C2PA_READ_FAILED";

export interface ProvenanceReport {
  file: { name: string; size: number; mimeType: string };
  results: Readonly<Record<string, SourceResult<unknown>>>;
  coverage: Coverage;
  signals: Signal[];
  verdict: Verdict;
  basis: SignalBasis | null;
  analyzedAt: string;
  engineVersion: string;
}
