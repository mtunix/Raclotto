import { useCallback, useEffect, useState } from "react";
import { useListPans } from "../../api/generated/endpoints/pans/pans";
import type { ListPansParams, PanDto } from "../../api/generated/model";
import { onErrorRetry } from "../../lib/api/swrHooks";

export interface PanFilter {
  session_key?: string;
  user_id?: number;
}

/**
 * The pans matching `filter`, newest first, fetched a page at a time.
 *
 * `loadMore` appends the next page. Only the newest page is refetched when the pan lists are
 * invalidated, so `replacePan` swaps in a fresh copy of a pan on an earlier page.
 */
export function usePanPages({ session_key, user_id }: PanFilter, pageSize = 12) {
  const [offset, setOffset] = useState(0);
  const [loaded, setLoaded] = useState<ReadonlyMap<number, PanDto[]>>(new Map());

  useEffect(() => {
    setOffset(0);
    setLoaded(new Map());
  }, [session_key, user_id]);

  const params: ListPansParams = {
    ...(session_key ? { session_key } : {}),
    ...(user_id ? { user_id } : {}),
    limit: pageSize,
    offset,
  };
  const { data: page, isLoading } = useListPans(params, {
    swr: {
      enabled: Boolean(session_key || user_id),
      onErrorRetry,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  });

  useEffect(() => {
    if (page) setLoaded((previous) => new Map(previous).set(page.offset, page.items));
  }, [page]);

  const loadMore = useCallback(() => {
    if (page?.has_more) setOffset(page.offset + pageSize);
  }, [page, pageSize]);

  const replacePan = useCallback((fresh: PanDto) => {
    setLoaded((previous) => {
      const next = new Map<number, PanDto[]>();
      previous.forEach((items, at) => next.set(at, items.map((pan) => (pan.id === fresh.id ? fresh : pan))));
      return next;
    });
  }, []);

  // The current page is read from SWR directly: right after a reset it is cached but not yet in `loaded`.
  const pages = new Map(loaded);
  if (page) pages.set(page.offset, page.items);

  return {
    pans: newestFirst(pages),
    hasMore: page?.has_more ?? false,
    loadMore,
    replacePan,
    isLoading,
  };
}

function newestFirst(pages: ReadonlyMap<number, PanDto[]>): PanDto[] {
  const seen = new Set<number>();
  const pans: PanDto[] = [];
  Array.from(pages.keys())
    .sort((a, b) => a - b)
    .forEach((at) => {
      for (const pan of pages.get(at) ?? []) {
        // A pan rolled after an earlier page loaded pushes that page's last pan onto the next one.
        if (!seen.has(pan.id)) {
          seen.add(pan.id);
          pans.push(pan);
        }
      }
    });
  return pans;
}
