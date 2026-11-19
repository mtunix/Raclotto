import { cameraErrorKey } from "./cameraError";

const named = (name: string, message = "") => Object.assign(new Error(message), { name });

it.each([
  ["NotAllowedError", "auth.cameraPermissionDenied"],
  ["PermissionDeniedError", "auth.cameraPermissionDenied"],
  ["NotFoundError", "auth.cameraNotFound"],
  ["DevicesNotFoundError", "auth.cameraNotFound"],
  ["NotReadableError", "auth.cameraInUse"],
  ["TrackStartError", "auth.cameraInUse"],
  ["NotSupportedError", "auth.cameraNotSupported"],
  ["ConstraintNotSatisfiedError", "auth.cameraNotSupported"],
  ["AbortError", "auth.cameraError"],
])("a %s says %s", (name, key) => {
  expect(cameraErrorKey(named(name))).toBe(key);
});

it("a TypeError from a missing media API means no camera support", () => {
  expect(cameraErrorKey(named("TypeError", "Cannot read properties of undefined (reading 'getUserMedia')"))).toBe(
    "auth.cameraNotSupported",
  );
  expect(cameraErrorKey(named("TypeError", "something else"))).toBe("auth.cameraError");
});

it("anything that is no error is a generic camera error", () => {
  expect([cameraErrorKey(undefined), cameraErrorKey("NotAllowedError"), cameraErrorKey({ name: 3 })]).toEqual([
    "auth.cameraError",
    "auth.cameraError",
    "auth.cameraError",
  ]);
});
