import { HttpMethod, RequestOptions, Transport } from "./transport";

export interface RecordedRequest {
  method: HttpMethod;
  path: string;
  query: RequestOptions["query"];
  body: unknown;
}

type Responder = (request: RecordedRequest) => unknown;

/**
 * In-memory transport adapter for tests.
 *
 * Register canned response documents per `METHOD /path` (query excluded);
 * every request is recorded in `requests`. Unregistered routes reject so a
 * test notices calls it did not expect.
 */
export class FakeTransport implements Transport {
  readonly requests: RecordedRequest[] = [];
  private readonly routes = new Map<string, Responder>();

  on(method: HttpMethod, path: string, response: unknown | Responder): this {
    this.routes.set(
      `${method} ${path}`,
      typeof response === "function"
        ? (response as Responder)
        : () => structuredCloneSafe(response),
    );
    return this;
  }

  async request(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const recorded: RecordedRequest = {
      method,
      path,
      query: options.query,
      body: options.body,
    };
    this.requests.push(recorded);
    const responder = this.routes.get(`${method} ${path}`);
    if (!responder) {
      throw new Error(`FakeTransport: no response registered for ${method} ${path}`);
    }
    return responder(recorded);
  }

  /** The last request made to `METHOD /path`, if any. */
  last(method: HttpMethod, path: string): RecordedRequest | undefined {
    return [...this.requests]
      .reverse()
      .find((r) => r.method === method && r.path === path);
  }
}

function structuredCloneSafe<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}
