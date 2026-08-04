import type {
  C2paData,
  ExifData,
  ProvenanceReport,
  SourceResult,
  XmpData,
} from "./types";

function source<T>(report: ProvenanceReport, id: string): SourceResult<T> {
  const result = report.results[id];
  return (result ?? { status: "absent" }) as SourceResult<T>;
}

export function getC2pa(report: ProvenanceReport): SourceResult<C2paData> {
  return source(report, "c2pa");
}

export function getExif(report: ProvenanceReport): SourceResult<ExifData> {
  return source(report, "exif");
}

export function getXmp(report: ProvenanceReport): SourceResult<XmpData> {
  return source(report, "xmp");
}
