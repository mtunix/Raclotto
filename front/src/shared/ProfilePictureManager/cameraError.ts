const NOT_SUPPORTED = "auth.cameraNotSupported";

// Current names first, then the legacy ones older browsers still report.
const keyByName = new Map([
  ["NotAllowedError", "auth.cameraPermissionDenied"],
  ["PermissionDeniedError", "auth.cameraPermissionDenied"],
  ["NotFoundError", "auth.cameraNotFound"],
  ["DevicesNotFoundError", "auth.cameraNotFound"],
  ["NotReadableError", "auth.cameraInUse"],
  ["TrackStartError", "auth.cameraInUse"],
  ["NotSupportedError", NOT_SUPPORTED],
  ["ConstraintNotSatisfiedError", NOT_SUPPORTED],
]);

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const nameOf = (error: unknown) => (isObject(error) && "name" in error && typeof error.name === "string" ? error.name : "");
const messageOf = (error: unknown) =>
  isObject(error) && "message" in error && typeof error.message === "string" ? error.message : "";

/** The translation key of the message for a camera that `getUserMedia` refused to open. */
export function cameraErrorKey(error: unknown): string {
  const name = nameOf(error);
  const byName = keyByName.get(name);
  if (byName) return byName;
  // Insecure origins leave `navigator.mediaDevices` undefined, which surfaces as a TypeError.
  const message = messageOf(error);
  if (name === "TypeError" && ["getUserMedia", "mediaDevices", "Cannot read"].some((s) => message.includes(s))) {
    return NOT_SUPPORTED;
  }
  return "auth.cameraError";
}
