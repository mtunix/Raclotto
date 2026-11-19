import { ApiErrorCode } from "../../api/generated/model";

/** The HTTP status a request failed with: from axios' response, or the `status` a test's fake sets. */
export function failedStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const response = "response" in error ? error.response : undefined;
  if (typeof response === "object" && response !== null && "status" in response && typeof response.status === "number") {
    return response.status;
  }
  return "status" in error && typeof error.status === "number" ? error.status : undefined;
}

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;

/** The `code` of the first error in the backend's `ErrorResponseDto`, when the failure carries one. */
function failedCode(error: unknown): unknown {
  const response = isObject(error) && "response" in error ? error.response : undefined;
  const body = isObject(response) && "data" in response ? response.data : undefined;
  const errors = isObject(body) && "errors" in body ? body.errors : undefined;
  const first: unknown = Array.isArray(errors) ? errors[0] : undefined;
  return isObject(first) && "code" in first ? first.code : undefined;
}

const KNOWN_CODES: ReadonlySet<unknown> = new Set(Object.values(ApiErrorCode));
const isKnownCode = (code: unknown): code is ApiErrorCode => KNOWN_CODES.has(code);

/**
 * What to tell the user about a failed request: the translation of the backend's error code, a generic
 * message for a code this client doesn't know, or `fallback` when the backend sent no error (no answer,
 * a proxy's page, a failure before the request).
 */
export function failureMessage(error: unknown, t: (key: string) => string, fallback: string): string {
  const code = failedCode(error);
  if (code === undefined) return fallback;
  return isKnownCode(code) ? t(`apiError.${code}`) : t("apiError.unknown");
}

/** Shortest password the backend accepts for a new account or a password change. */
export const MIN_PASSWORD_LENGTH = 8;
