import { availableCounts, ingredientsForUser } from "../../../lib/api/__fixtures__/backendResponses";
import { banditLimits, isRestricted } from "./banditLimits";

const [potato, pork, aioli, leek] = ingredientsForUser;

it("spins over the available ingredients the diet allows", () => {
    const sold = { ...leek, available: false };
    expect(banditLimits([potato, pork, aioli, sold]).items).toEqual([potato]);
});

it("counts the diet's exclusions against all available ingredients", () => {
    const { fills, sauces } = banditLimits(ingredientsForUser, availableCounts);
    expect(fills).toEqual({ allowed: 2, total: 3 });
    expect(sauces).toEqual({ allowed: 0, total: 1 });
    expect(isRestricted(fills)).toBe(true);
    expect(isRestricted({ allowed: 2, total: 2 })).toBe(false);
});

it("allows as many columns as there are ingredients the server lets the user roll", () => {
    expect(banditLimits(ingredientsForUser, availableCounts).maxColumns).toBe(2);
    expect(banditLimits(ingredientsForUser, { ...availableCounts, fill_count: 1 }).maxColumns).toBe(1);
});

it("estimates from the ingredients until the server's counts are in", () => {
    const { fills, sauces, maxColumns } = banditLimits(ingredientsForUser);
    expect(fills.allowed).toBe(2);
    // No allowed sauce yet reads as unknown, so the controls stay usable.
    expect(sauces.allowed).toBe(999);
    expect(maxColumns).toBe(2);
});
