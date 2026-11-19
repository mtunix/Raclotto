import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import {
  useGetAvailableCounts,
  useListIngredients,
} from "../../api/generated/endpoints/ingredients/ingredients";
import {
  availableCounts,
  ingredient,
  ingredientImport,
  ingredientReimport,
  ingredientsForUser,
} from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../lib/api/transport";
import { ingredientCatalog } from "./ingredientCatalog";

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
  fake = new FakeTransport()
    .on("GET", "/ingredients", ingredientsForUser)
    .on("GET", "/ingredients/available-counts", availableCounts);
  previous = setTransport(fake);
});

afterEach(() => {
  setTransport(previous);
});

/** Runs a catalog change inside act(), since it makes the rendered hooks refetch. */
async function change<T>(run: () => Promise<T>): Promise<T> {
  const results: T[] = [];
  await act(async () => {
    results.push(await run());
  });
  return results[0];
}

const fetches = (path: string, sessionKey: string) =>
  fake.requests.filter(
    (r) => r.method === "GET" && r.path === path && r.query?.session_key === sessionKey,
  ).length;

/**
 * The session's ingredient list and counts as views load them, in the default cache that the
 * catalog's invalidation reaches; each test uses a session key of its own.
 */
async function renderCatalog(sessionKey: string) {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children);
  const { result } = renderHook(
    () => ({
      ingredients: useListIngredients({ session_key: sessionKey }),
      counts: useGetAvailableCounts({ session_key: sessionKey }),
    }),
    { wrapper },
  );
  await waitFor(() => {
    expect(result.current.ingredients.data).toEqual(ingredientsForUser);
    expect(result.current.counts.data).toEqual(availableCounts);
  });
  expect([fetches("/ingredients", sessionKey), fetches("/ingredients/available-counts", sessionKey)]).toEqual([1, 1]);
}

async function expectRefetched(sessionKey: string) {
  await waitFor(() =>
    expect([
      fetches("/ingredients", sessionKey),
      fetches("/ingredients/available-counts", sessionKey),
    ]).toEqual([2, 2]),
  );
}

it("create sends the session in the query and refetches the list and counts", async () => {
  fake.on("POST", "/ingredients", ingredient);
  await renderCatalog("create");
  const body = { name: "Leek", type: 1 as const, vegan: true, spicy: 1 };

  expect(await change(() => ingredientCatalog.create("create", body))).toEqual(ingredient);

  expect(fake.last("POST", "/ingredients")).toEqual({
    method: "POST",
    path: "/ingredients",
    query: { session_key: "create" },
    body,
  });
  await expectRefetched("create");
});

it("update sends only the changed fields and refetches", async () => {
  fake.on("PATCH", `/ingredients/${ingredient.id}`, { ...ingredient, spicy: 2 });
  await renderCatalog("update");

  await change(() => ingredientCatalog.update("update", ingredient.id, { spicy: 2 }));

  expect(fake.last("PATCH", `/ingredients/${ingredient.id}`)?.body).toEqual({ spicy: 2 });
  await expectRefetched("update");
});

it("remove checks the session and refetches", async () => {
  fake.on("DELETE", `/ingredients/${ingredient.id}`, undefined);
  await renderCatalog("remove");

  await change(() => ingredientCatalog.remove("remove", ingredient.id));

  expect(fake.last("DELETE", `/ingredients/${ingredient.id}`)?.query).toEqual({ session_key: "remove" });
  await expectRefetched("remove");
});

it("refill names the ingredient in the body and refetches", async () => {
  fake.on("POST", "/ingredients/refill", ingredient);
  await renderCatalog("refill");

  await change(() => ingredientCatalog.refill("refill", ingredient.id));

  expect(fake.last("POST", "/ingredients/refill")?.body).toEqual({ id: ingredient.id });
  await expectRefetched("refill");
});

it("import and reimport send the list and refetch", async () => {
  fake.on("POST", "/ingredients/import", ingredientImport);
  fake.on("POST", "/ingredients/reimport", ingredientReimport);
  const corn = { name: "Corn", type: 1 as const, vegan: true };

  await renderCatalog("import");
  expect(await change(() => ingredientCatalog.import("import", [corn]))).toEqual(ingredientImport);
  await expectRefetched("import");
  expect(fake.last("POST", "/ingredients/import")).toMatchObject({
    query: { session_key: "import" },
    body: { ingredients: [corn] },
  });

  await renderCatalog("reimport");
  expect(await change(() => ingredientCatalog.reimport("reimport", [corn]))).toEqual(ingredientReimport);
  await expectRefetched("reimport");
  expect(fake.last("POST", "/ingredients/reimport")?.query).toEqual({ session_key: "reimport" });
});

it("a failed change refetches nothing", async () => {
  fake.on("POST", "/ingredients/refill", () => {
    throw new Error("404");
  });
  await renderCatalog("failed");

  await expect(ingredientCatalog.refill("failed", 999)).rejects.toThrow("404");

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect([fetches("/ingredients", "failed"), fetches("/ingredients/available-counts", "failed")]).toEqual([1, 1]);
});
