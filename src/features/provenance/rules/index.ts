import { C2PA_RULES } from "../detectors/c2pa/rules";
import { EXIF_RULES } from "../detectors/exif/rules";
import { XMP_RULES } from "../detectors/xmp/rules";
import type {
  C2paData,
  ExifData,
  Signal,
  SignalBasis,
  SourceResult,
  Verdict,
  XmpData,
} from "../types";

const MEANINGFUL_EXIF_FIELDS = new Set([
  "exif.Software",
  "exif.DateTimeOriginal",
  "exif.CreateDate",
  "exif.Artist",
  "exif.Creator",
  "exif.Copyright",
  "exif.Make",
  "exif.Model",
  "iptc.By-line",
  "iptc.Copyright Notice",
]);

const MEANINGFUL_XMP_FIELDS = new Set([
  "xmp.Provenance",
  "xmp.CreatorTool",
  "xmp.CreateDate",
  "xmp.Creator",
  "xmp.Copyright",
  "xmp.DigitalSourceType",
]);

function isPresent<T>(result: SourceResult<unknown> | undefined): result is {
  status: "present";
  data: T;
} {
  return result?.status === "present";
}

function c2paSignals(data: C2paData): Signal[] {
  const basis: SignalBasis =
    data.validation.integrity === "valid" ? "explicit" : "heuristic";
  return C2PA_RULES.flatMap((rule) =>
    rule.match(data).map((evidence) => ({
      id: rule.id,
      source: rule.source,
      category: rule.category,
      basis,
      labelKey: rule.labelKey,
      evidence,
    })),
  );
}

function exifSignals(data: ExifData): Signal[] {
  return EXIF_RULES.flatMap((rule) =>
    rule.match(data).map((evidence) => ({
      id: rule.id,
      source: rule.source,
      category: rule.category,
      basis: rule.basis,
      labelKey: rule.labelKey,
      evidence,
    })),
  );
}

function xmpSignals(data: XmpData): Signal[] {
  return XMP_RULES.flatMap((rule) =>
    rule.match(data).map((evidence) => ({
      id: rule.id,
      source: rule.source,
      category: rule.category,
      basis: rule.basis,
      labelKey: rule.labelKey,
      evidence,
    })),
  );
}

function meaningfulSources(
  results: Readonly<Record<string, SourceResult<unknown>>>,
): string[] {
  const meaningful: string[] = [];
  const c2pa = results.c2pa;
  if (
    isPresent<C2paData>(c2pa) &&
    Object.keys(c2pa.data.manifests).length > 0
  ) {
    meaningful.push("c2pa");
  }

  const exif = results.exif;
  if (
    isPresent<ExifData>(exif) &&
    Object.keys(exif.data.fields).some((path) =>
      MEANINGFUL_EXIF_FIELDS.has(path),
    )
  ) {
    meaningful.push("exif");
  }

  const xmp = results.xmp;
  if (
    isPresent<XmpData>(xmp) &&
    Object.keys(xmp.data.fields).some(
      (path) =>
        MEANINGFUL_XMP_FIELDS.has(path) || path.startsWith("xmp.History"),
    )
  ) {
    meaningful.push("xmp");
  }

  return meaningful;
}

export interface Evaluation {
  signals: Signal[];
  verdict: Verdict;
  basis: SignalBasis | null;
  withMeaningfulData: string[];
}

export function evaluate(
  results: Readonly<Record<string, SourceResult<unknown>>>,
): Evaluation {
  const c2pa = results.c2pa;
  const exif = results.exif;
  const xmp = results.xmp;
  const signals = [
    ...(isPresent<C2paData>(c2pa) ? c2paSignals(c2pa.data) : []),
    ...(isPresent<ExifData>(exif) ? exifSignals(exif.data) : []),
    ...(isPresent<XmpData>(xmp) ? xmpSignals(xmp.data) : []),
  ];
  const aiSignals = signals.filter(
    (signal) =>
      signal.category === "ai-generation" || signal.category === "ai-editing",
  );
  const withMeaningfulData = meaningfulSources(results);

  if (aiSignals.length > 0) {
    return {
      signals,
      verdict: "AI_RELATED_PROVENANCE",
      basis: aiSignals.some((signal) => signal.basis === "explicit")
        ? "explicit"
        : "heuristic",
      withMeaningfulData,
    };
  }

  return {
    signals,
    verdict:
      withMeaningfulData.length > 0
        ? "NO_AI_RELATED_PROVENANCE_FOUND"
        : "NO_PROVENANCE_INFORMATION",
    basis: null,
    withMeaningfulData,
  };
}
