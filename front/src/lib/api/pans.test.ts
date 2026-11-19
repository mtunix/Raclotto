import {
  createPan,
  getListPansKey,
  listPans,
  rollBanditPan,
  updatePan,
} from "../../api/generated/endpoints/pans/pans";
import { createRating } from "../../api/generated/endpoints/ratings/ratings";
import type { PanPageDto, RatingDto, RollOutcomeDto } from "../../api/generated/model";
import { panPage, rating, rollOutcome } from "./__fixtures__/backendResponses";
import { FakeTransport } from "./fakeTransport";
import { setTransport, type Transport } from "./transport";

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
  fake = new FakeTransport();
  previous = setTransport(fake);
});

afterEach(() => {
  setTransport(previous);
});

describe("pan rolls through the transport", () => {
  it("rolls a bandit pan with a plain body and the session in the query", async () => {
    fake.on("POST", "/pans/generate/bandit", rollOutcome);

    const outcome: RollOutcomeDto = await rollBanditPan(
      { total_columns: 3, roll_prep_type: false, roll_cheese: true },
      { session_key: "s1" },
    );

    expect(fake.last("POST", "/pans/generate/bandit")).toEqual({
      method: "POST",
      path: "/pans/generate/bandit",
      query: { session_key: "s1" },
      body: { total_columns: 3, roll_prep_type: false, roll_cheese: true },
    });
    expect(outcome).toEqual(rollOutcome);
  });

  it("clones a pan from its ingredient ids", async () => {
    fake.on("POST", "/pans", rollOutcome);
    const source = rollOutcome.pan;

    await createPan(
      { name: source.name, ingredients: source.ingredients.map((i) => i.id) },
      { session_key: "s1" },
    );

    expect(fake.last("POST", "/pans")?.body).toEqual({
      name: source.name,
      ingredients: source.ingredients.map((i) => i.id),
    });
  });
});

describe("pan lists", () => {
  it("asks for one page and returns it as sent", async () => {
    fake.on("GET", "/pans", panPage);

    const page: PanPageDto = await listPans({ user_id: [7, 8], rating: [3.5], sort: "rating", limit: 12, offset: 24 });

    expect(fake.last("GET", "/pans")?.query).toEqual({ user_id: [7, 8], rating: [3.5], sort: "rating", limit: 12, offset: 24 });
    expect(page).toEqual(panPage);
    expect(page.items[0].author?.border_texture).toBe("cheese");
  });

  it("keys every filter below the same path", () => {
    const [path] = getListPansKey();
    expect(getListPansKey({ session_key: "s1", limit: 12, offset: 0 })[0]).toBe(path);
    expect(getListPansKey({ user_id: [7], sort: "rating" })[0]).toBe(path);
  });
});

it("patches a pan with only the changed fields", async () => {
  fake.on("PATCH", `/pans/${rollOutcome.pan.id}`, { ...rollOutcome.pan, snacked: true });

  const pan = await updatePan(rollOutcome.pan.id, { snacked: true });

  expect(fake.last("PATCH", `/pans/${rollOutcome.pan.id}`)?.body).toEqual({ snacked: true });
  expect(pan.snacked).toBe(true);
});

it("rates a pan without naming the user", async () => {
  fake.on("POST", "/ratings", rating);

  const created: RatingDto = await createRating({ pan_id: rating.pan_id, rating: 4.5 });

  expect(fake.last("POST", "/ratings")).toEqual({
    method: "POST",
    path: "/ratings",
    query: undefined,
    body: { pan_id: rating.pan_id, rating: 4.5 },
  });
  expect(created).toEqual(rating);
});
