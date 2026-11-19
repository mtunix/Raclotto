/** The HTTP status a request failed with: from axios' response, or the `status` a test's fake sets. */
export function failedStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const response = "response" in error ? error.response : undefined;
  if (typeof response === "object" && response !== null && "status" in response && typeof response.status === "number") {
    return response.status;
  }
  return "status" in error && typeof error.status === "number" ? error.status : undefined;
}

/** Shortest password the backend accepts for a new account or a password change. */
export const MIN_PASSWORD_LENGTH = 8;
