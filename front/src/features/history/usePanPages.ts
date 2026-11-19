import { useCallback, useState } from "react";
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
  const filter = JSON.stringify([session_key, user_id]);
  const [stored, setStored] = useState<Pages>(() => startOver(filter));
  // Reset while rendering, not in an effect, so the old offset is never asked for with the new filter.
  let pages = stored;
  if (stored.filter !== filter) {
    pages = startOver(filter);
    setStored(pages);
  }
  const { offset, loaded } = pages;

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

  const [mergedPage, setMergedPage] = useState<typeof page>(undefined);
  if (page && page !== mergedPage) {
    setMergedPage(page);
    setStored((previous) =>
      previous.filter === filter
        ? { ...previous, loaded: new Map(previous.loaded).set(page.offset, page.items) }
        : previous,
    );
  }

  const loadMore = useCallback(() => {
    if (page?.has_more) {
      const next = page.offset + pageSize;
      setStored((previous) => (previous.filter === filter ? { ...previous, offset: next } : previous));
    }
  }, [page, pageSize, filter]);

  const replacePan = useCallback((fresh: PanDto) => {
    setStored((previous) => {
      const next = new Map<number, PanDto[]>();
      previous.loaded.forEach((items, at) => next.set(at, items.map((pan) => (pan.id === fresh.id ? fresh : pan))));
      return { ...previous, loaded: next };
    });
  }, []);

  // The current page is read from SWR directly: right after a reset it is cached but not yet in `loaded`.
  const shown = new Map(loaded);
  if (page) shown.set(page.offset, page.items);

  return {
    pans: newestFirst(shown),
    hasMore: page?.has_more ?? false,
    loadMore,
    replacePan,
    isLoading,
  };
}

interface Pages {
  filter: string;
  offset: number;
  loaded: ReadonlyMap<number, PanDto[]>;
}

function startOver(filter: string): Pages {
  return { filter, offset: 0, loaded: new Map() };
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
