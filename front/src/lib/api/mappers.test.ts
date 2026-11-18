import { IngredientType } from "../../model/ingredient";
import { flatten } from "./jsonapi";
import { toAchievement, toPan } from "./mappers";
import { achievementResource, panAttributes } from "./__fixtures__/wire";

describe("toPan", () => {
    it("maps nested ingredients, ratings and preparation type", () => {
        const pan = toPan({ ...panAttributes(), id: 11 });

        expect(pan).toMatchObject({
            id: 11,
            name: "Cheesy Delight",
            snacked: false,
            rating: 4,
            cheese_level: 3,
            preparation_type_id: 2,
            preparation_type: { id: 2, name: "Grilled", session_id: null },
            ratings: [{ id: 5, rating: 4, user_id: 7, pan_id: 11 }],
        });
        expect(pan.ingredients.map((i) => [i.id, i.name, i.type])).toEqual([
            [1, "Potato", IngredientType.FILL],
            [2, "Aioli", IngredientType.SAUCE],
        ]);
        expect(pan.ingredients[0].lactose).toBe(true);
    });
});

describe("toAchievement", () => {
    it("maps a flattened resource and keeps per-user fields only when sent", () => {
        const plain = toAchievement(flatten(achievementResource(3, "First Pan")));
        expect(plain).toEqual({
            id: 3,
            title: "First Pan",
            description: "First Pan description",
            value: 10,
            hidden: false,
        });

        const listed = toAchievement({
            ...flatten(achievementResource(4, "Grill")),
            unlocked: true,
            progress: 0.5,
        });
        expect(listed.unlocked).toBe(true);
        expect(listed.progress).toBe(0.5);
    });
});
