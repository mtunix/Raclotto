import axios from "axios";
import { axiosTransport } from "./transport";

jest.mock("axios", () => {
  const instance = {
    request: jest.fn(() => Promise.resolve({ data: { ok: true } })),
    isAxiosError: () => false,
  };
  return { __esModule: true, default: instance };
});

const request = axios.request as jest.Mock;

describe("axiosTransport", () => {
  it("drops empty query values and repeats keys for arrays", async () => {
    const body = await axiosTransport.request("GET", "/things", {
      query: { tags: ["a", null, "b"], limit: undefined, session_key: "s", flag: false },
    });

    expect(body).toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "/api/things",
        params: { tags: ["a", "b"], session_key: "s", flag: false },
        paramsSerializer: { indexes: null },
      }),
    );
  });
});
