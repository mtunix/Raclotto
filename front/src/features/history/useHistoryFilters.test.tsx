import { act } from "@testing-library/react";
import { renderRoutes } from "../../testUtils";
import { type HistoryFilters, parseHistoryFilters, useHistoryFilters, withHistoryFilters } from "./useHistoryFilters";

const parse = (search: string) => parseHistoryFilters(new URLSearchParams(search));

const defaults: HistoryFilters = { sort: "time", direction: "desc", users: [], ratings: [], ingredientCounts: [] };

describe("parseHistoryFilters", () => {
  it("is newest first and unfiltered without params", () => {
    expect(parse("")).toEqual(defaults);
  });

  it("reads every filter, repeated params as a list", () => {
    expect(parse("sort=rating&direction=asc&user=3&user=7&rating=4.5&rating=0&ingredients=1-3&ingredients=10%2B")).toEqual({
      sort: "rating",
      direction: "asc",
      users: [3, 7],
      ratings: [4.5, 0],
      ingredientCounts: ["1-3", "10+"],
    });
  });

  it("falls back to the default for an unknown sort or direction", () => {
    expect(parse("sort=name&direction=sideways")).toEqual(defaults);
  });

  it("drops values that aren't a user id, a rating or an ingredient count, and duplicates", () => {
    expect(parse("user=abc&user=-1&user=2.5&user=&user=4&user=4&rating=6&rating=x&rating=&rating=3&ingredients=2-5&ingredients=4-6")).toEqual({
      ...defaults,
      users: [4],
      ratings: [3],
      ingredientCounts: ["4-6"],
    });
  });
});

describe("withHistoryFilters", () => {
  const write = (search: string, change: Partial<HistoryFilters>) =>
    withHistoryFilters(new URLSearchParams(search), change).toString();

  it("keeps defaults and empty lists out of the URL", () => {
    expect(write("sort=rating&user=3", { sort: "time", users: [] })).toBe("");
  });

  it("writes lists as repeated params, and keeps the filters it doesn't change", () => {
    expect(write("direction=asc", { users: [3, 7], ingredientCounts: ["10+"] }))
      .toBe("direction=asc&user=3&user=7&ingredients=10%2B");
  });

  it("leaves params it doesn't own alone", () => {
    expect(write("tab=mine&user=3", { users: [4] })).toBe("tab=mine&user=4");
  });

  it("drops invalid params it finds on the way", () => {
    expect(write("sort=name&user=abc", { ratings: [4.5] })).toBe("rating=4.5");
  });
});

describe("useHistoryFilters", () => {
  function render(path: string) {
    const seen: { current?: ReturnType<typeof useHistoryFilters> } = {};
    function Probe() {
      seen.current = useHistoryFilters();
      return null;
    }
    const { router } = renderRoutes([{ path: "/history", element: <Probe /> }], path);
    return { router, filters: () => seen.current! };
  }

  it("reads the filters from the URL", () => {
    const { filters } = render("/history?sort=counts&user=3&rating=4.5&ingredients=4-6");

    expect(filters().filters).toEqual({ ...defaults, sort: "counts", users: [3], ratings: [4.5], ingredientCounts: ["4-6"] });
    expect(filters().filterCount).toBe(3);
  });

  it("writes changes to the URL in place of the current entry", () => {
    const { router, filters } = render("/history");

    act(() => filters().setSort("rating"));
    act(() => filters().setUsers([3, 7]));
    act(() => filters().setIngredientCounts(["1-3"]));

    expect(router.state.location.search).toBe("?sort=rating&user=3&user=7&ingredients=1-3");
    expect(router.state.historyAction).toBe("REPLACE");
    expect(filters().filters).toMatchObject({ sort: "rating", users: [3, 7], ingredientCounts: ["1-3"] });
  });

  it("clears the filters but keeps the order", () => {
    const { router, filters } = render("/history?direction=asc&user=3&rating=2&ingredients=7-9");

    act(() => filters().clearFilters());

    expect(router.state.location.search).toBe("?direction=asc");
    expect(filters().filterCount).toBe(0);
  });
});
