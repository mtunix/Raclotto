import axios from "axios";
import { getMe, login } from "../../api/generated/endpoints/auth/auth";
import { useAuthStore } from "../../AuthSlice";
import { loginResult } from "./__fixtures__/backendResponses";
import { axiosTransport, setTransport, Transport, UnauthorizedError } from "./transport";

jest.mock("axios", () => {
  const instance = {
    request: jest.fn(),
    isAxiosError: (error: unknown) =>
      typeof error === "object" && error !== null && "isAxiosError" in error,
  };
  return { __esModule: true, default: instance };
});

const request = axios.request as jest.Mock;
const unauthorized = { isAxiosError: true, response: { status: 401, data: { errors: [] } } };

let previous: Transport;

beforeEach(() => {
  previous = setTransport(axiosTransport);
  request.mockReset();
});

afterEach(() => {
  setTransport(previous);
  useAuthStore.getState().logout();
});

it("a 401 from a generated call signs the user out", async () => {
  useAuthStore.getState().login(loginResult.token, loginResult.user);
  request.mockRejectedValueOnce(unauthorized);

  await expect(getMe()).rejects.toBeInstanceOf(UnauthorizedError);

  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "GET",
      url: "/api/auth/me",
      headers: expect.objectContaining({ Authorization: `Bearer ${loginResult.token}` }),
    }),
  );
  expect(useAuthStore.getState()).toMatchObject({ token: null, user: null, isAuthenticated: false });
  expect(localStorage.getItem("auth_token")).toBeNull();
});

it("bad credentials reject with UnauthorizedError and leave the user signed out", async () => {
  request.mockRejectedValueOnce(unauthorized);

  const attempt = login({ name_or_email: "Ada", password: "wrong" });

  await expect(attempt).rejects.toBeInstanceOf(UnauthorizedError);
  await expect(attempt).rejects.toThrow("Unauthorized");
  expect(useAuthStore.getState()).toMatchObject({ token: null, user: null, isAuthenticated: false });
});

it("other errors pass through unchanged", async () => {
  const badRequest = { isAxiosError: true, response: { status: 400 } };
  request.mockRejectedValueOnce(badRequest);
  jest.spyOn(console, "error").mockImplementation(() => {});

  await expect(login({ name_or_email: "", password: "" })).rejects.toBe(badRequest);
});
