import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { PanDto, PanPageDto } from "../../api/generated/model";
import { panPage } from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport, type RecordedRequest } from "../../lib/api/fakeTransport";
import { mutatePanLists } from "../../lib/api/swrHooks";
import { setTransport, type Transport } from "../../lib/api/transport";
import { type PanFilter, usePanPages } from "./usePanPages";

const pan = (id: number, rating = 0): PanDto => ({ ...panPage.items[0], id, name: `Pan ${id}`, rating });

/** A backend of `total` pans with ids total..1, newest first; `ratings` overrides a pan's rating. */
function backend(total: number, ratings: Map<number, number> = new Map()) {
  return (request: RecordedRequest): PanPageDto => {
    const { limit, offset } = request.query as { limit: number; offset: number };
    const ids = Array.from({ length: total }, (_, i) => total - i).slice(offset, offset + limit);
    return {
      items: ids.map((id) => pan(id, ratings.get(id) ?? 0)),
      total,
      limit,
      offset,
      has_more: offset + ids.length < total,
    };
  };
}

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
  fake = new FakeTransport();
  previous = setTransport(fake);
});

afterEach(() => {
  setTransport(previous);
});

// The default cache, which `mutatePanLists` reaches; every test uses filters of its own.
function render(initial: PanFilter) {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children);
  return renderHook((filter: PanFilter) => usePanPages(filter, 2), { wrapper, initialProps: initial });
}

const ids = (pans: PanDto[]) => pans.map((p) => p.id);

it("appends the next page on loadMore", async () => {
  fake.on("GET", "/pans", backend(5));
  const { result } = render({ session_key: "append" });

  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4]));
  expect(fake.last("GET", "/pans")?.query).toEqual({ session_key: "append", limit: 2, offset: 0 });
  expect(result.current.hasMore).toBe(true);

  act(() => result.current.loadMore());
  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4, 3, 2]));
  act(() => result.current.loadMore());
  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4, 3, 2, 1]));
  expect(result.current.hasMore).toBe(false);
});

it("shows refetched pans of the newest page instead of the copies loaded before", async () => {
  const ratings = new Map<number, number>();
  fake.on("GET", "/pans", backend(4, ratings));
  const { result } = render({ user_id: [7] });
  await waitFor(() => expect(ids(result.current.pans)).toEqual([4, 3]));
  act(() => result.current.loadMore());
  await waitFor(() => expect(ids(result.current.pans)).toEqual([4, 3, 2, 1]));

  ratings.set(2, 5);
  await act(() => mutatePanLists());

  await waitFor(() => expect(result.current.pans.find((p) => p.id === 2)?.rating).toBe(5));
  expect(ids(result.current.pans)).toEqual([4, 3, 2, 1]);
});

it("replaces a pan on an earlier page", async () => {
  fake.on("GET", "/pans", backend(4));
  const { result } = render({ session_key: "replace" });
  await waitFor(() => expect(ids(result.current.pans)).toEqual([4, 3]));
  act(() => result.current.loadMore());
  await waitFor(() => expect(ids(result.current.pans)).toEqual([4, 3, 2, 1]));

  act(() => result.current.replacePan(pan(4, 3.5)));

  expect(result.current.pans.map((p) => p.rating)).toEqual([3.5, 0, 0, 0]);
});

it("drops a pan pushed onto the next page by a newer roll", async () => {
  let total = 3;
  fake.on("GET", "/pans", (request: RecordedRequest) => backend(total)(request));
  const { result } = render({ session_key: "pushed" });
  await waitFor(() => expect(ids(result.current.pans)).toEqual([3, 2]));

  total = 4;
  act(() => result.current.loadMore());

  await waitFor(() => expect(fake.requests).toHaveLength(2));
  await waitFor(() => expect(ids(result.current.pans)).toEqual([3, 2, 1]));
});

it("starts over when the filter changes", async () => {
  fake.on("GET", "/pans", backend(5));
  const { result, rerender } = render({ session_key: "before" });
  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4]));
  act(() => result.current.loadMore());
  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4, 3, 2]));

  rerender({ session_key: "after" });

  await waitFor(() => expect(fake.last("GET", "/pans")?.query).toEqual({ session_key: "after", limit: 2, offset: 0 }));
  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4]));
});

it("asks the server to sort and filter, and starts over when the order or a filter changes", async () => {
  fake.on("GET", "/pans", backend(5));
  const { result, rerender } = render({ session_key: "sorted", user_id: [], rating: [] });
  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4]));
  act(() => result.current.loadMore());
  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4, 3, 2]));
  expect(fake.last("GET", "/pans")?.query).toEqual({ session_key: "sorted", limit: 2, offset: 2 });

  rerender({ session_key: "sorted", sort: "rating", direction: "desc", rating: [4.5], user_id: [7] });

  await waitFor(() =>
    expect(fake.last("GET", "/pans")?.query).toEqual({
      session_key: "sorted",
      user_id: [7],
      rating: [4.5],
      sort: "rating",
      direction: "desc",
      limit: 2,
      offset: 0,
    }),
  );
  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4]));

  rerender({ session_key: "sorted", sort: "rating", direction: "desc", rating: [4.5], user_id: [7], ingredient_count: ["4-6"] });
  await waitFor(() => expect(fake.last("GET", "/pans")?.query).toMatchObject({ ingredient_count: ["4-6"], offset: 0 }));
});

it("never asks for or shows a page of the previous filter's offset", async () => {
  fake.on("GET", "/pans", backend(5));
  // Requests since `since` for any page but the first.
  const later = (since: number) => fake.requests.slice(since).filter((r) => (r.query as { offset: number }).offset !== 0);
  const loadAll = async () => {
    await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4]));
    act(() => result.current.loadMore());
    await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4, 3, 2]));
    act(() => result.current.loadMore());
    await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4, 3, 2, 1]));
  };
  const { result, rerender } = render({ session_key: "first" });
  await loadAll();

  let since = fake.requests.length;
  rerender({ session_key: "second" });
  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4]));
  expect(later(since)).toEqual([]);
  await loadAll();

  since = fake.requests.length;
  rerender({ session_key: "first" });
  await act(async () => {});

  await waitFor(() => expect(ids(result.current.pans)).toEqual([5, 4]));
  expect(result.current.hasMore).toBe(true);
  expect(later(since)).toEqual([]);
});

it("fetches nothing without a filter", async () => {
  fake.on("GET", "/pans", backend(5));
  const { result } = render({ session_key: "" });

  await act(async () => {});

  expect(fake.requests).toEqual([]);
  expect(result.current.pans).toEqual([]);
});
