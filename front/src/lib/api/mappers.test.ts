import { IngredientType } from "../../model/ingredient";
import { flatten } from "./jsonapi";
import {
    toAchievement,
    toPan,
    toSession,
    toUser,
    toUserStats,
} from "./mappers";
import {
    achievementResource,
    levelDict,
    panAttributes,
    userAttributes,
} from "./__fixtures__/wire";

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

describe("toSession", () => {
    it("parses the timestamp and numeric id", () => {
        const session = toSession(
            flatten({
                type: "session",
                id: "5",
                attributes: {
                    key: "abc",
                    name: "Friday",
                    timestamp: "2026-11-18T19:00:00",
                    active: false,
                    created_by_user_id: 1,
                },
            }),
        );
        expect(session.id).toBe(5);
        expect(session.key).toBe("abc");
        expect(session.active).toBe(false);
        expect(session.timestamp).toBeInstanceOf(Date);
    });
});

describe("toUser", () => {
    it("maps a GET user with level and treats a missing next_level as max level", () => {
        const user = toUser({
            ...userAttributes(),
            id: 7,
            level: levelDict(9, "Legend", 5000),
        });
        expect(user.level).toEqual({ id: 9, name: "Legend", required_experience: 5000 });
        expect(user.next_level).toBeNull();
    });

    it("leaves level keys absent for a PATCH response so spreading keeps the known level", () => {
        const known = toUser({
            ...userAttributes(),
            id: 7,
            level: levelDict(2, "Cook", 100),
            next_level: levelDict(3, "Chef", 140),
        });
        const patched = toUser({ ...userAttributes(), id: 7, name: "Ada L." });

        expect("level" in patched).toBe(false);
        expect("next_level" in patched).toBe(false);
        const merged = { ...known, ...patched };
        expect(merged.name).toBe("Ada L.");
        expect(merged.level?.id).toBe(2);
    });

    it("maps profile achievements", () => {
        const user = toUser({
            ...userAttributes(),
            id: 7,
            achievements: [
                { id: 1, title: "A", description: "a", value: 5, hidden: false },
            ],
        });
        expect(user.achievements).toEqual([
            { id: 1, title: "A", description: "a", value: 5, hidden: false },
        ]);
    });
});

describe("toUserStats", () => {
    it("maps embedded ingredient summaries through the ingredient mapper", () => {
        const stats = toUserStats({
            total_pans: 3,
            best_rated_ingredient: { id: 1, name: "Potato", type: 1, avg_rating: 4.5 },
            favorite_ingredient: null,
            most_ingredients_pan: {
                id: 11,
                name: "Big",
                ingredient_count: 1,
                ingredients: [{ id: 2, name: "Aioli", type: 2 }],
            },
        });
        expect(stats.total_pans).toBe(3);
        expect(stats.favorite_ingredient).toBeNull();
        expect(stats.best_rated_ingredient).toMatchObject({
            id: 1,
            name: "Potato",
            avg_rating: 4.5,
            meat: false,
        });
        expect(stats.most_ingredients_pan?.ingredients[0].type).toBe(IngredientType.SAUCE);
    });
});
