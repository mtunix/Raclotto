import { act, renderHook } from "@testing-library/react";
import { type IngredientDto, IngredientType, type PanDto } from "../../../api/generated/model";
import { ingredientsForUser, rollOutcome } from "../../../lib/api/__fixtures__/backendResponses";
import { useIngredientStore } from "./ingredientStore";
import { useClassicRollCounts } from "./useClassicRollCounts";

const fills = ingredientsForUser.filter((i) => i.type === IngredientType.FILL);
const sauces = ingredientsForUser.filter((i) => i.type === IngredientType.SAUCE);

beforeEach(() => {
  localStorage.clear();
  useIngredientStore.setState({ ingredientCount: 0, sauceCount: 0 });
});

function render(ingredients: IngredientDto[] = ingredientsForUser) {
  return renderHook(() => useClassicRollCounts(ingredients));
}

it("starts from the remembered counts", () => {
  useIngredientStore.setState({ ingredientCount: 2, sauceCount: 1 });

  const { result } = render();

  expect(result.current.fill.count).toBe(2);
  expect(result.current.sauce.count).toBe(1);
});

it("caps each count at the session's ingredients of its type", () => {
  expect(fills.length).toBeGreaterThan(0);
  const { result } = render();
  expect(result.current.fill.total).toBe(fills.length);
  expect(result.current.sauce.total).toBe(sauces.length);

  act(() => result.current.fill.change(fills.length + 5));
  expect(result.current.fill.count).toBe(fills.length);
  act(() => result.current.fill.increment());
  expect(result.current.fill.count).toBe(fills.length);
  act(() => result.current.fill.decrement());

  expect(result.current.fill.count).toBe(fills.length - 1);
  expect(useIngredientStore.getState().ingredientCount).toBe(fills.length - 1);
});

it("rolls only once something is asked for", () => {
  const { result } = render();
  expect(result.current.canRoll).toBe(false);

  act(() => result.current.sauce.increment());

  expect(result.current.canRoll).toBe(true);
});

it("takes over the counts a rolled pan actually got", () => {
  const { result } = render();
  act(() => result.current.fill.change(1));
  const pan: PanDto = rollOutcome.pan;
  const fillsGot = pan.ingredients.filter((i) => i.type === IngredientType.FILL).length;
  const saucesGot = pan.ingredients.filter((i) => i.type === IngredientType.SAUCE).length;

  act(() => result.current.follow(pan));

  expect(result.current.fill.count).toBe(fillsGot);
  expect(result.current.sauce.count).toBe(saucesGot);
});
