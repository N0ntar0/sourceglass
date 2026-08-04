import type { AnalysisInput } from "../features/provenance";

function mimeTypeFor(file: File): string {
  if (file.type !== "") return file.type;

  const extension = file.name.split(".").pop()?.toLowerCase();
  const byExtension: Readonly<Record<string, string>> = {
    avif: "image/avif",
    heic: "image/heic",
    heif: "image/heif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return extension === undefined
    ? "application/octet-stream"
    : (byExtension[extension] ?? "application/octet-stream");
}

function readBytes(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("The selected image could not be read as bytes."));
    });
    reader.addEventListener("error", () => {
      reject(
        reader.error ?? new Error("The selected image could not be read."),
      );
    });
    reader.readAsArrayBuffer(file);
  });
}

async function decodePixels(
  file: File,
  maxEdge: number | undefined,
): Promise<ImageData> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const scale =
      maxEdge === undefined
        ? 1
        : Math.min(
            1,
            maxEdge / Math.max(image.naturalWidth, image.naturalHeight),
          );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("A 2D canvas is unavailable.");
    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Adapts a browser File to the DOM-independent provenance engine boundary. */
export function createFileAnalysisInput(file: File): AnalysisInput {
  let bytesPromise: Promise<ArrayBuffer> | undefined;
  const pixelsByMaxEdge = new Map<string, Promise<ImageData>>();

  return {
    file: {
      name: file.name,
      size: file.size,
      mimeType: mimeTypeFor(file),
    },
    async bytes() {
      bytesPromise ??= readBytes(file);
      return (await bytesPromise).slice(0);
    },
    pixels(options) {
      const key =
        options?.maxEdge === undefined ? "original" : String(options.maxEdge);
      let pixels = pixelsByMaxEdge.get(key);
      if (pixels === undefined) {
        pixels = decodePixels(file, options?.maxEdge);
        pixelsByMaxEdge.set(key, pixels);
      }
      return pixels;
    },
  };
}
