import { useState } from "react";
import { useListPans } from "../../api/generated/endpoints/pans/pans";
import type { ListPansParams, PanDto } from "../../api/generated/model";
import { onErrorRetry } from "../../lib/api/swrHooks";

/** Whose pans (a session's, a user's or both), which of them and in what order; the server sorts and filters. */
export type PanFilter = Omit<ListPansParams, "session_key" | "limit" | "offset"> & { session_key?: string };

/**
 * The pans matching `filter`, in its order (newest first by default), fetched a page at a time.
 *
 * `loadMore` appends the next page. Only the newest page is refetched when the pan lists are
 * invalidated, so `replacePan` swaps in a fresh copy of a pan on an earlier page, and `removePan`
 * drops a deleted one, asking for the next page that much earlier.
 */
export function usePanPages(
  { session_key, user_id = [], rating = [], ingredient_count = [], sort, direction }: PanFilter,
  pageSize = 12,
) {
  const filtered: ListPansParams = {
    ...(session_key ? { session_key } : {}),
    ...(user_id.length ? { user_id } : {}),
    ...(rating.length ? { rating } : {}),
    ...(ingredient_count.length ? { ingredient_count } : {}),
    ...(sort ? { sort } : {}),
    ...(direction ? { direction } : {}),
  };
  const filter = JSON.stringify(filtered);
  const [stored, setStored] = useState<Pages>(() => startOver(filter));
  // Reset while rendering, not in an effect, so the old offset is never asked for with the new filter.
  let pages = stored;
  if (stored.filter !== filter) {
    pages = startOver(filter);
    setStored(pages);
  }
  const { offset, loaded, removed } = pages;

  const { data: page, isLoading } = useListPans({ ...filtered, limit: pageSize, offset }, {
    swr: {
      enabled: Boolean(session_key || user_id.length),
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

  const loadMore = () => {
    if (page?.has_more) {
      setStored((previous) =>
        previous.filter === filter
          ? { ...previous, offset: page.offset + pageSize - previous.shift, shift: 0 }
          : previous,
      );
    }
  };

  const replacePan = (fresh: PanDto) => {
    setStored((previous) => {
      const next = new Map<number, PanDto[]>();
      previous.loaded.forEach((items, at) => next.set(at, items.map((pan) => (pan.id === fresh.id ? fresh : pan))));
      return { ...previous, loaded: next };
    });
  };

  const removePan = (gone: number) => {
    setStored((previous) => ({ ...previous, removed: [...previous.removed, gone], shift: previous.shift + 1 }));
  };

  // The current page is read from SWR directly: right after a reset it is cached but not yet in `loaded`.
  const shown = new Map(loaded);
  if (page) shown.set(page.offset, page.items);

  return {
    pans: inPageOrder(shown).filter((pan) => !removed.includes(pan.id)),
    hasMore: page?.has_more ?? false,
    loadMore,
    replacePan,
    removePan,
    isLoading,
  };
}

interface Pages {
  filter: string;
  offset: number;
  loaded: ReadonlyMap<number, PanDto[]>;
  /** Pans deleted since the filter was set; the pages loaded before still list them. */
  removed: readonly number[];
  /** Pans deleted since the newest page loaded: each moved a later pan up onto a loaded page. */
  shift: number;
}

function startOver(filter: string): Pages {
  return { filter, offset: 0, loaded: new Map(), removed: [], shift: 0 };
}

function inPageOrder(pages: ReadonlyMap<number, PanDto[]>): PanDto[] {
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
