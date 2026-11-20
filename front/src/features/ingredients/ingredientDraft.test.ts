import { act, renderHook } from "@testing-library/react";
import { type IngredientForUserDto, IngredientType } from "../../api/generated/model";
import { ingredientsForUser } from "../../lib/api/__fixtures__/backendResponses";
import { bodyOf, draftOf, useIngredientDraft } from "./ingredientDraft";

const [, pork, aioli] = ingredientsForUser;

describe("draftOf", () => {
  it("drafts a new ingredient as vegetarian, mild and of the given type", () => {
    expect(draftOf(null, IngredientType.SAUCE)).toEqual({
      name: "",
      type: IngredientType.SAUCE,
      spicy: 0,
      wildcard: false,
      sweet: false,
      category: "vegetarian",
      allergens: { histamine: false, gluten: false, fructose: false, lactose: false },
    });
  });

  it("drafts an ingredient as it is, whatever type is given", () => {
    const draft = draftOf({ ...pork, meat: true, vegetarian: false, gluten: true, spicy: 2 }, IngredientType.SAUCE);

    expect(draft).toMatchObject({ name: pork.name, type: pork.type, spicy: 2, category: "meat" });
    expect(draft.allergens.gluten).toBe(true);
  });

  it("takes the first category of an ingredient that has several, and none of one without", () => {
    const flags = { meat: false, vegetarian: false, vegan: false, fish: false };
    expect(draftOf({ ...pork, ...flags, vegan: true, fish: true }, IngredientType.FILL).category).toBe("vegan");
    expect(draftOf({ ...pork, ...flags }, IngredientType.FILL).category).toBeNull();
  });
});

describe("bodyOf", () => {
  it("sends the category as one flag each, and every allergen", () => {
    const body = bodyOf({ ...draftOf(null, IngredientType.FILL), name: "Tuna", category: "fish" });

    expect(body).toEqual({
      name: "Tuna",
      type: IngredientType.FILL,
      spicy: 0,
      wildcard: false,
      sweet: false,
      meat: false,
      vegetarian: false,
      vegan: false,
      fish: true,
      histamine: false,
      gluten: false,
      fructose: false,
      lactose: false,
    });
  });
});

describe("useIngredientDraft", () => {
  type Props = { open: boolean; ingredient: IngredientForUserDto | null; type: IngredientType };

  function render(initial: Props) {
    return renderHook(({ open, ingredient, type }: Props) => useIngredientDraft(open, ingredient, type), { initialProps: initial });
  }

  it("starts over when the modal opens again", () => {
    const { result, rerender } = render({ open: true, ingredient: null, type: IngredientType.FILL });
    act(() => result.current.change({ name: "Corn", category: "meat" }));

    rerender({ open: false, ingredient: null, type: IngredientType.FILL });
    expect(result.current.draft.name).toBe("Corn");
    rerender({ open: true, ingredient: null, type: IngredientType.FILL });

    expect(result.current.draft).toEqual(draftOf(null, IngredientType.FILL));
  });

  it("starts over from another ingredient switched to while open", () => {
    const { result, rerender } = render({ open: true, ingredient: pork, type: IngredientType.FILL });
    act(() => result.current.change({ name: "Bacon" }));

    rerender({ open: true, ingredient: aioli, type: IngredientType.FILL });

    expect(result.current.draft).toEqual(draftOf(aioli, IngredientType.FILL));
  });

  it("reports a missing name once it was changed or a save was tried", () => {
    const { result } = render({ open: true, ingredient: null, type: IngredientType.FILL });
    expect(result.current.nameMissing).toBe(false);

    let saveable = true;
    act(() => {
      saveable = result.current.check();
    });
    expect(saveable).toBe(false);
    expect(result.current.nameMissing).toBe(true);

    act(() => result.current.change({ name: "C" }));
    expect(result.current.nameMissing).toBe(false);
    act(() => result.current.change({ name: "" }));
    expect(result.current.nameMissing).toBe(true);
  });

  it("can't be saved without a category", () => {
    const { result } = render({ open: true, ingredient: null, type: IngredientType.FILL });
    act(() => result.current.change({ name: "Corn", category: null }));

    expect(result.current.categoryMissing).toBe(true);
    let saveable = true;
    act(() => {
      saveable = result.current.check();
    });
    expect(saveable).toBe(false);

    act(() => result.current.change({ category: "vegan" }));
    expect(result.current.categoryMissing).toBe(false);
    expect(result.current.body).toMatchObject({ name: "Corn", vegan: true, vegetarian: false });
  });
});
