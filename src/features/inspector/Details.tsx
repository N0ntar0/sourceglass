import { t } from "../../i18n";
import {
  getC2pa,
  getExif,
  getXmp,
  type MetadataField,
  type ProvenanceReport,
  type SignalSource,
  type SourceResult,
} from "../provenance";

interface DetailRow {
  field: string;
  value: string;
  evidence?: string;
}

function statusRows(result: SourceResult<unknown>): DetailRow[] {
  switch (result.status) {
    case "absent":
      return [{ field: "status", value: t("status.absent") }];
    case "not-checked":
      return [
        {
          field: "status",
          value: `${t("status.notChecked")}: ${result.reason}`,
        },
      ];
    case "error":
      return [
        {
          field: "status",
          value: `${t("status.error")}: ${result.error.code}`,
          evidence: result.error.message,
        },
      ];
    case "present":
      return [];
  }
}

function signalRows(
  report: ProvenanceReport,
  source: SignalSource,
): DetailRow[] {
  return report.signals
    .filter((signal) => signal.source === source)
    .map((signal) => ({
      field: `signal.${signal.id}`,
      value: signal.evidence.value,
      evidence: signal.evidence.path,
    }));
}

function c2paRows(report: ProvenanceReport): DetailRow[] {
  const c2pa = getC2pa(report);
  if (c2pa.status !== "present") return statusRows(c2pa);

  const rows: DetailRow[] = [
    { field: "active_manifest", value: c2pa.data.activeManifest ?? "—" },
    {
      field: "validation.integrity",
      value: c2pa.data.validation.integrity,
    },
    {
      field: "validation.signerTrust",
      value: c2pa.data.validation.signerTrust,
    },
    {
      field: "validation.rawState",
      value: c2pa.data.validation.rawState ?? "—",
    },
  ];

  for (const [label, manifest] of Object.entries(c2pa.data.manifests)) {
    rows.push({
      field: `manifests.${label}.title`,
      value: manifest.title ?? "—",
    });
    for (const [index, generator] of manifest.claimGenerators.entries()) {
      rows.push({
        field: `manifests.${label}.claimGenerators[${index}]`,
        value: generator,
      });
    }
    for (const [index, assertion] of manifest.assertions.entries()) {
      rows.push({
        field: `manifests.${label}.assertions[${index}].${assertion.label}`,
        value: JSON.stringify(assertion.data),
      });
    }
  }

  for (const [index, failure] of c2pa.data.validation.failures.entries()) {
    rows.push({
      field: `validation.failures[${index}].${failure.code}`,
      value: failure.explanation ?? "—",
    });
  }
  return [...signalRows(report, "c2pa"), ...rows];
}

function metadataValue(field: MetadataField): string {
  return field.values
    .map((value) =>
      value.truncated
        ? `${value.value} ${t("value.truncated", { n: value.originalLength })}`
        : value.value,
    )
    .join(" | ");
}

function metadataRows(
  report: ProvenanceReport,
  source: "exif" | "xmp",
): DetailRow[] {
  const result = source === "exif" ? getExif(report) : getXmp(report);
  if (result.status !== "present") return statusRows(result);

  const rows = Object.entries(result.data.fields).map(([path, field]) => ({
    field: path,
    value: metadataValue(field),
    evidence: field.arrayTruncated
      ? `arrayTruncated=true; originalCount=${field.originalCount}`
      : undefined,
  }));
  return [...signalRows(report, source), ...rows];
}

function DetailTable({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>{t("details.field")}</th>
            <th>{t("details.value")}</th>
            <th>{t("details.evidence")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.field}-${index}`}>
              <td>{row.field}</td>
              <td>{row.value}</td>
              <td className="evidence">{row.evidence ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Details({ report }: { report: ProvenanceReport }) {
  return (
    <div>
      <details className="details">
        <summary>{t("details.c2pa")}</summary>
        <DetailTable rows={c2paRows(report)} />
      </details>
      <details className="details">
        <summary>{t("details.exif")}</summary>
        <DetailTable rows={metadataRows(report, "exif")} />
      </details>
      <details className="details">
        <summary>{t("details.xmp")}</summary>
        <DetailTable rows={metadataRows(report, "xmp")} />
      </details>
    </div>
  );
}
