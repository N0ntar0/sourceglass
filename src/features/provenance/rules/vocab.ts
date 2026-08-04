export const DIGITAL_SOURCE_TYPE_BASE =
  "http://cv.iptc.org/newscodes/digitalsourcetype/";

export const TRAINED_ALGORITHMIC_MEDIA = `${DIGITAL_SOURCE_TYPE_BASE}trainedAlgorithmicMedia`;
export const COMPOSITE_WITH_TRAINED_ALGORITHMIC_MEDIA = `${DIGITAL_SOURCE_TYPE_BASE}compositeWithTrainedAlgorithmicMedia`;
export const ALGORITHMIC_MEDIA = `${DIGITAL_SOURCE_TYPE_BASE}algorithmicMedia`;

export const AI_DIGITAL_SOURCE_TYPES = new Set([
  TRAINED_ALGORITHMIC_MEDIA,
  COMPOSITE_WITH_TRAINED_ALGORITHMIC_MEDIA,
]);

export const KNOWN_AI_TOOL_NAMES = [
  "Adobe Firefly",
  "ChatGPT",
  "DALL-E",
  "DALL·E",
  "Google Imagen",
  "Midjourney",
  "OpenAI GPT Image",
  "Stable Diffusion",
] as const;

export function isKnownAiTool(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  return KNOWN_AI_TOOL_NAMES.some((name) => {
    const candidate = name.toLocaleLowerCase("en-US");
    return (
      normalized === candidate ||
      normalized.startsWith(`${candidate} `) ||
      normalized.startsWith(`${candidate}/`) ||
      normalized.startsWith(`${candidate} v`)
    );
  });
}
