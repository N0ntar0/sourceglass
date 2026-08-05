import type { MetadataField, MetadataValue } from "../../types";

const VALUE_LENGTH_LIMIT = 512;
const ARRAY_LENGTH_LIMIT = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function primitiveStrings(value: unknown): string[] {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => primitiveStrings(item));
  }

  return [];
}

function normalizedValue(value: string): MetadataValue {
  return {
    value: value.slice(0, VALUE_LENGTH_LIMIT),
    truncated: value.length > VALUE_LENGTH_LIMIT,
    originalLength: value.length,
  };
}

function fieldFromStrings(values: string[]): MetadataField | null {
  if (values.length === 0) return null;
  const retained = values.slice(0, ARRAY_LENGTH_LIMIT);

  return {
    values: retained.map(normalizedValue),
    originalCount: values.length,
    arrayTruncated: values.length > ARRAY_LENGTH_LIMIT,
  };
}

function tagStrings(tag: unknown): string[] {
  if (!isRecord(tag)) return primitiveStrings(tag);
  const fromValue = primitiveStrings(tag.value);
  if (fromValue.length > 0) return fromValue;
  return primitiveStrings(tag.description);
}

function flattenGroup(
  group: unknown,
  prefix: string,
  output: Record<string, MetadataField>,
): void {
  if (!isRecord(group)) return;

  for (const [name, tag] of Object.entries(group)) {
    if (name.startsWith("_") || name === "about") continue;
    const path = `${prefix}.${name}`;
    const field = fieldFromStrings(tagStrings(tag));
    if (field !== null) {
      output[path] = field;
      continue;
    }

    if (isRecord(tag) && "value" in tag) {
      if (Array.isArray(tag.value)) {
        tag.value.forEach((item, index) =>
          flattenGroup(item, `${path}[${index}]`, output),
        );
      } else {
        flattenGroup(tag.value, path, output);
      }
    }
  }
}

export function normalizeMetadataGroups(
  groups: ReadonlyArray<{ name: string; value: unknown }>,
): Readonly<Record<string, MetadataField>> {
  const fields: Record<string, MetadataField> = {};
  for (const group of groups) flattenGroup(group.value, group.name, fields);
  return fields;
}
