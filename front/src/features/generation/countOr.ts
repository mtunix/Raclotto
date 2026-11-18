/**
 * The server's count once loaded; until then (or when it failed) the caller's estimate, and 999
 * for an estimate of 0 so the count controls stay usable while loading.
 */
export function countOr(count: number | undefined, estimate: number): number {
  return count ?? (estimate > 0 ? estimate : 999);
}
