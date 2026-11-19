import { ApiErrorCode } from "../../api/generated/model";
import { failureMessage } from "./failedRequest";

const t = (key: string) => key;

const answered = (code: unknown) =>
  Object.assign(new Error("Request failed with status code 409"), {
    response: { status: 409, data: { errors: [{ code, title: "Conflict", detail: "English detail" }] } },
  });

it("translates the backend's error code, never its English", () => {
  expect(failureMessage(answered(ApiErrorCode.conflict), t, "fallback")).toBe("apiError.api_error_code.conflict");
});

it("says something generic for a code this client doesn't know", () => {
  expect(failureMessage(answered("api_error_code.from_the_future"), t, "fallback")).toBe("apiError.unknown");
});

it("falls back to the caller's text when the backend sent no error", () => {
  expect(failureMessage(new Error("Network Error"), t, "fallback")).toBe("fallback");
  expect(failureMessage(Object.assign(new Error("502"), { response: { status: 502, data: "<html>" } }), t, "fallback")).toBe(
    "fallback",
  );
});
