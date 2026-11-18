import type { AxiosError } from "axios";
import { HttpMethod, QueryParam, transport } from "./transport";

/** The request description orval's generated functions pass to {@link orvalMutator}. */
export interface OrvalRequest {
  url: string;
  method: HttpMethod;
  params?: Record<string, QueryParam>;
  data?: unknown;
  headers?: Record<string, string>;
}

/** What a failed generated request rejects with: the axios error, or a plain Error (401, tests). */
export type ErrorType<ErrorBody> = AxiosError<ErrorBody> | Error;

/**
 * orval's custom instance: every generated endpoint function goes through the transport, so
 * auth headers, 401 handling and `FakeTransport` apply to generated code too. Headers orval adds
 * (the JSON Content-Type) are left to the transport.
 */
export function orvalMutator<T>(config: OrvalRequest): Promise<T> {
  // The response body is typed by the OpenAPI spec the caller was generated from.
  return transport().request(config.method, config.url, {
    query: config.params,
    body: config.data,
  }) as Promise<T>;
}
