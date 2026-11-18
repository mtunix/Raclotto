import axios from "axios";
import { useAuthStore } from "../../AuthSlice";

/**
 * The transport is the seam between the API module and the network.
 *
 * Endpoint functions only ever talk to a {@link Transport}: they name a method,
 * a path below `/api` and optionally a query and a JSON body, and get the
 * parsed JSON response document back. Everything HTTP-specific (base URL,
 * headers, bearer token, 401 handling) lives in the adapter.
 *
 * Production uses {@link axiosTransport}; tests install an in-memory adapter
 * (see `fakeTransport.ts`) via {@link setTransport}.
 */
export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  /** Query parameters; `undefined`/`null` values are dropped. */
  query?: Record<string, QueryValue>;
  /** Request body, serialized as JSON. */
  body?: unknown;
}

export interface Transport {
  /**
   * Perform a request against the backend API.
   * @param path path below `/api`, e.g. `/pans/generate`
   * @returns the parsed JSON response body (undefined for empty responses)
   */
  request(
    method: HttpMethod,
    path: string,
    options?: RequestOptions,
  ): Promise<unknown>;
}

export const API_BASE = "/api";
const CONTENT_TYPE = "application/vnd.api+json";

function headers(): Record<string, string> {
  const token = useAuthStore.getState().token;
  const result: Record<string, string> = {
    "Content-Type": CONTENT_TYPE,
    Accept: CONTENT_TYPE,
  };
  if (token) {
    result["Authorization"] = `Bearer ${token}`;
  }
  return result;
}

function dropEmpty(
  query: Record<string, QueryValue> | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!query) return undefined;
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result;
}

/** Production adapter: axios, JSON:API headers, bearer token, 401 → logout. */
export const axiosTransport: Transport = {
  async request(method, path, options = {}) {
    try {
      const response = await axios.request({
        method,
        url: `${API_BASE}${path}`,
        params: dropEmpty(options.query),
        data: options.body,
        headers: headers(),
      });
      return response.data === "" ? undefined : response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Clear auth state; the redirect is handled by ProtectedRoute
        useAuthStore.getState().logout();
        throw new Error("Unauthorized");
      }
      console.error("Error:", error);
      throw error;
    }
  },
};

let current: Transport = axiosTransport;

/** The transport endpoint functions use. */
export function transport(): Transport {
  return current;
}

/** Swap the transport (tests). Returns the previous one so it can be restored. */
export function setTransport(next: Transport): Transport {
  const previous = current;
  current = next;
  return previous;
}
