import { ingredientExport } from "../../lib/api/__fixtures__/backendResponses";
// What users downloaded from the export before the typed endpoints; the backend tests import it too.
import OLD_EXPORT_FILE from "../../../../back/test/fixtures/ingredient_export_before_dtos.json?raw";
import { categoryProblem } from "../ingredients/ingredientCatalog";
import {
  stageExportFile,
  type StagedIngredient,
  toImported,
} from "./ingredientImport";

const staged = (overrides: Partial<StagedIngredient>): StagedIngredient => ({
  id: 1,
  name: "Potato",
  type: 1,
  available: true,
  meat: false,
  vegetarian: false,
  vegan: true,
  fish: false,
  gluten: false,
  histamine: false,
  fructose: false,
  lactose: false,
  spicy: 0,
  wildcard: false,
  sweet: false,
  ...overrides,
});

describe("an old export file", () => {
  const ingredients = stageExportFile(OLD_EXPORT_FILE);

  it("stages every ingredient with all its fields", () => {
    expect(ingredients?.map((i) => i.name)).toEqual(["Potato", "Salmon", "Bacon", "Pesto"]);
    expect(ingredients?.[1]).toEqual(staged({
      id: 2, name: "Salmon", vegan: false, fish: true, spicy: 1, histamine: true,
    }));
    expect(ingredients?.[2]).toMatchObject({ meat: true, spicy: 3, wildcard: true });
    expect(ingredients?.[3]).toMatchObject({ type: 2, available: false, sweet: true, lactose: true });
    expect(ingredients?.every((i) => categoryProblem(i) === null)).toBe(true);
  });

  it("imports without ids and reimports with them, never naming a session", () => {
    const salmon = ingredients![1];

    expect(toImported(salmon, false)).toEqual({
      name: "Salmon", type: 1, available: true, meat: false, vegetarian: false, vegan: false, fish: true,
      gluten: false, histamine: true, fructose: false, lactose: false, spicy: 1, wildcard: false, sweet: false,
    });
    expect(toImported(salmon, true)).toEqual({ ...toImported(salmon, false), id: 2 });
  });

  it("reads the same as a current export", () => {
    const current = stageExportFile(JSON.stringify(ingredientExport));

    expect(current?.length).toBe(ingredientExport.ingredients.length);
    expect(current?.map((i) => i.id)).toEqual(ingredientExport.ingredients.map((i) => i.id));
  });
});

it("is no file when the text is not JSON or has no ingredient list", () => {
  expect(stageExportFile("{not json")).toBeNull();
  expect(stageExportFile('{"items": []}')).toBeNull();
  expect(stageExportFile("[]")).toBeNull();
});

it("fills in what a hand-written file leaves out", () => {
  expect(stageExportFile('{"ingredients": [{"name": "Corn", "type": "FILL", "vegan": true}]}')).toEqual([
    staged({ id: null, name: "Corn" }),
  ]);
});

it("an ingredient without an id is created by a reimport", () => {
  expect(toImported(staged({ id: null }), true)).not.toHaveProperty("id");
});

it("an unknown type cannot be imported", () => {
  expect(toImported(staged({ type: 3 }), false)).toBeNull();
});

it("checks the backend's category rule", () => {
  expect(categoryProblem(staged({ vegan: false }))).toBe("none");
  expect(categoryProblem(staged({ fish: true }))).toBe("several");
  expect(categoryProblem(staged({ vegan: false, meat: true, vegetarian: true }))).toBe("several");
  expect(categoryProblem(staged({ vegan: false, fish: true }))).toBeNull();
});
