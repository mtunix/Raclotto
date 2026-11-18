/**
 * The JSON:API envelope, as the backend actually emits it.
 *
 * Wire facts (back/src/api/serializer.py, base_api.py):
 * - Resource endpoints answer `{ jsonapi, data: Resource | Resource[], meta? }`
 *   where `Resource = { type, id, attributes }`. `id` is a string for
 *   serializer-built resources and may be a number for hand-built ones.
 *   `id` is never repeated inside `attributes`.
 * - "Plain" endpoints (stats, leaderboard) put an ordinary JSON value in
 *   `data` — no resource wrapper.
 * - Nested objects inside attributes (a pan's ingredients/ratings/
 *   preparation_type) are plain dicts carrying
 *   their own `id`, not resources.
 * - Errors: `{ jsonapi, errors: [...] }` with a non-2xx status.
 */
export type Id = string | number;

export interface Resource<A = Record<string, unknown>> {
  type: string;
  id?: Id | null;
  attributes: A;
}

export interface Document<D = unknown, M = Record<string, unknown>> {
  jsonapi?: { version: string };
  data: D;
  meta?: M;
}

/** A resource's attributes merged with its numeric id. */
export type Fields = Record<string, unknown> & { id: number };

export function toId(id: unknown): number {
  if (typeof id === "number") return id;
  if (typeof id === "string" && id !== "") return parseInt(id, 10);
  throw new Error(`Invalid resource id: ${String(id)}`);
}

export function flatten(resource: Resource): Fields {
  return { ...resource.attributes, id: toId(resource.id) };
}

function asDocument(body: unknown): Document {
  if (!body || typeof body !== "object" || !("data" in body)) {
    throw new Error("Invalid JSON:API response: missing data");
  }
  return body as Document;
}

/** `data` is a single resource → its flattened fields. */
export function single(body: unknown): Fields {
  const { data } = asDocument(body);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid JSON:API response: expected a single resource");
  }
  return flatten(data as Resource);
}

/** `data` is a resource array → flattened fields per resource. */
export function collection(body: unknown): Fields[] {
  const { data } = asDocument(body);
  if (!Array.isArray(data)) {
    throw new Error("Invalid JSON:API response: expected a resource array");
  }
  return (data as Resource[]).map(flatten);
}

/** `data` is a plain (non-resource) JSON value. */
export function plain<T>(body: unknown): T {
  return asDocument(body).data as T;
}
