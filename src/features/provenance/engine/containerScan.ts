import type { MetadataErrorCode } from "../types";

export const METADATA_BYTES_LIMIT = 262_144;
export const UNSCANNED_CONTAINER_BYTES_LIMIT = 8 * 1024 * 1024;

export interface ContainerScan {
  format: "jpeg" | "png" | "webp" | "avif" | "heic";
  metadataBytes: number;
  hasExif: boolean | null;
  hasXmp: boolean | null;
  hasIptc: boolean | null;
}

export interface ContainerScanError {
  code: MetadataErrorCode;
  message: string;
}

export type ContainerScanResult =
  | { status: "ok"; scan: ContainerScan }
  | { status: "error"; error: ContainerScanError };

const JPEG_APP1 = 0xe1;
const JPEG_APP13 = 0xed;
const JPEG_APP_MIN = 0xe0;
const JPEG_APP_MAX = 0xef;
const JPEG_START_OF_SCAN = 0xda;
const JPEG_END_OF_IMAGE = 0xd9;

function startsWith(
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[],
): boolean {
  if (offset + expected.length > bytes.length) return false;
  return expected.every((value, index) => bytes[offset + index] === value);
}

function unreadable(format: string): ContainerScanResult {
  return {
    status: "error",
    error: {
      code: "CONTAINER_UNREADABLE",
      message: `The ${format} container is truncated or malformed.`,
    },
  };
}

function finalize(scan: ContainerScan): ContainerScanResult {
  if (scan.metadataBytes > METADATA_BYTES_LIMIT) {
    return {
      status: "error",
      error: {
        code: "METADATA_TOO_LARGE",
        message: `Metadata exceeds the ${METADATA_BYTES_LIMIT}-byte limit.`,
      },
    };
  }

  return { status: "ok", scan };
}

function scanJpeg(bytes: Uint8Array): ContainerScanResult {
  if (!startsWith(bytes, 0, [0xff, 0xd8])) return unreadable("JPEG");

  const scan: ContainerScan = {
    format: "jpeg",
    metadataBytes: 0,
    hasExif: false,
    hasXmp: false,
    hasIptc: false,
  };
  let offset = 2;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return unreadable("JPEG");
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    if (marker === undefined) return unreadable("JPEG");
    offset += 1;

    if (marker === JPEG_START_OF_SCAN || marker === JPEG_END_OF_IMAGE) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) return unreadable("JPEG");

    const segmentLength = (bytes[offset] ?? 0) * 256 + (bytes[offset + 1] ?? 0);
    if (segmentLength < 2 || offset + segmentLength > bytes.length)
      return unreadable("JPEG");

    const payloadOffset = offset + 2;
    const payloadLength = segmentLength - 2;
    if (marker >= JPEG_APP_MIN && marker <= JPEG_APP_MAX) {
      scan.metadataBytes += payloadLength;
    }

    if (marker === JPEG_APP1) {
      if (
        startsWith(bytes, payloadOffset, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00])
      ) {
        scan.hasExif = true;
      } else if (
        ascii(bytes, payloadOffset, Math.min(payloadLength, 40)).startsWith(
          "http://ns.adobe.com/xap/",
        ) ||
        ascii(bytes, payloadOffset, Math.min(payloadLength, 40)).startsWith(
          "http://ns.adobe.com/xmp/extension/",
        )
      ) {
        scan.hasXmp = true;
      }
    } else if (marker === JPEG_APP13) {
      scan.hasIptc = true;
    }

    offset += segmentLength;
  }

  return finalize(scan);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function scanPng(bytes: Uint8Array): ContainerScanResult {
  if (!startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return unreadable("PNG");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const scan: ContainerScan = {
    format: "png",
    metadataBytes: 0,
    hasExif: false,
    hasXmp: false,
    hasIptc: false,
  };
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = ascii(bytes, offset + 4, 4);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + length + 4;
    if (nextOffset > bytes.length) return unreadable("PNG");

    if (["eXIf", "iTXt", "tEXt", "zTXt", "iCCP"].includes(type)) {
      scan.metadataBytes += length;
    }

    if (type === "eXIf") {
      scan.hasExif = true;
    } else if (
      type === "iTXt" &&
      ascii(bytes, dataOffset, Math.min(length, 21)).startsWith(
        "XML:com.adobe.xmp",
      )
    ) {
      scan.hasXmp = true;
    }

    offset = nextOffset;
    if (type === "IEND") break;
  }

  return finalize(scan);
}

function scanWebp(bytes: Uint8Array): ContainerScanResult {
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    return unreadable("WebP");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const scan: ContainerScan = {
    format: "webp",
    metadataBytes: 0,
    hasExif: false,
    hasXmp: false,
    hasIptc: false,
  };
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = view.getUint32(offset + 4, true);
    const nextOffset = offset + 8 + length + (length % 2);
    if (nextOffset > bytes.length) return unreadable("WebP");

    if (["EXIF", "XMP ", "ICCP"].includes(type)) {
      scan.metadataBytes += length;
    }

    if (type === "EXIF") {
      scan.hasExif = true;
    } else if (type === "XMP ") {
      scan.hasXmp = true;
    }

    offset = nextOffset;
  }

  return finalize(scan);
}

function scanUnscannedContainer(
  bytes: Uint8Array,
  format: "avif" | "heic",
): ContainerScanResult {
  if (bytes.byteLength > UNSCANNED_CONTAINER_BYTES_LIMIT) {
    return {
      status: "error",
      error: {
        code: "METADATA_TOO_LARGE",
        message: `${format.toUpperCase()} exceeds the ${UNSCANNED_CONTAINER_BYTES_LIMIT}-byte fallback limit.`,
      },
    };
  }

  return {
    status: "ok",
    scan: {
      format,
      metadataBytes: 0,
      hasExif: null,
      hasXmp: null,
      hasIptc: null,
    },
  };
}

export function containerScan(
  bytesBuffer: ArrayBuffer,
  mimeType: string,
): ContainerScanResult {
  const bytes = new Uint8Array(bytesBuffer);

  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return scanJpeg(bytes);
    case "image/png":
      return scanPng(bytes);
    case "image/webp":
      return scanWebp(bytes);
    case "image/avif":
      return scanUnscannedContainer(bytes, "avif");
    case "image/heic":
    case "image/heif":
      return scanUnscannedContainer(bytes, "heic");
    default:
      return unreadable("image");
  }
}
