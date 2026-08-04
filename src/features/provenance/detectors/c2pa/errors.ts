import type { C2paErrorCode } from "../../types";

export function c2paError(
  code: C2paErrorCode,
  error: unknown,
): { code: C2paErrorCode; message: string } {
  return {
    code,
    message: error instanceof Error ? error.message : "C2PA parsing failed.",
  };
}
