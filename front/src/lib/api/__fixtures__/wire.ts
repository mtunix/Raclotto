/**
 * Response documents in the exact shape the backend emits
 * (serializer.py: string ids, attributes without id; nested dicts inline).
 */
export const ingredientDict = (id: number, name: string, type = 1) => ({
    id,
    name,
    session_id: 1,
    type,
    available: true,
    meat: false,
    vegetarian: true,
    vegan: false,
    fish: false,
    gluten: false,
    histamine: false,
    fructose: false,
    lactose: true,
    spicy: 1,
    wildcard: false,
    sweet: false,
});

/** Pan attributes as `Pan.as_dict()` produces them (roll endpoints). */
export const panAttributes = () => ({
    name: "Cheesy Delight",
    session_id: 1,
    user_id: 7,
    timestamp: "2026-11-18T19:00:00",
    snacked: false,
    preparation_type_id: 2,
    cheese_level: 3,
    rolled_preparation_type: true,
    rolled_cheese: true,
    rating: 4,
    ratings: [{ id: 5, rating: 4, user_id: 7, pan_id: 11, session_id: 1 }],
    ingredients: [ingredientDict(1, "Potato"), ingredientDict(2, "Aioli", 2)],
    preparation_type: { id: 2, name: "Grilled", session_id: null },
});

/** The list endpoint enriches pans with the author's display fields. */
export const enrichedPanAttributes = () => ({
    ...panAttributes(),
    user: "Ada",
    user_color: "#ff0000",
    user_profile_picture: null,
    user_border_style: "solid",
    user_border_texture: "cheese",
    user_glow_effect: true,
});

export const levelDict = (id: number, name: string, required_experience: number) => ({
    id,
    name,
    required_experience,
});

export const achievementResource = (id: number, title: string) => ({
    type: "achievement",
    id: String(id),
    attributes: {
        title,
        description: `${title} description`,
        value: 10,
        hidden: false,
        is_global: true,
    },
});

export const rollDocument = (overrides: { leveled_up?: boolean } = {}) => ({
    jsonapi: { version: "1.0" },
    data: { type: "pan", id: "11", attributes: panAttributes() },
    meta: {
        newly_unlocked_achievements: [achievementResource(3, "First Pan")],
        reward: {
            xp_gained: 42,
            xp_before: 100,
            xp_after: 142,
            level: overrides.leveled_up
                ? levelDict(3, "Chef", 140)
                : levelDict(2, "Cook", 100),
            previous_level: levelDict(2, "Cook", 100),
            next_level: overrides.leveled_up
                ? levelDict(4, "Master", 300)
                : levelDict(3, "Chef", 140),
            leveled_up: !!overrides.leveled_up,
        },
        events: [
            {
                type: "event",
                id: "9",
                attributes: {
                    session_id: 1,
                    event_type: "pan_duel",
                    message: "Duel!",
                    data: { pan1_id: 11 },
                    created_at: "2026-11-18T19:00:01",
                },
            },
        ],
    },
});

export const userAttributes = () => ({
    name: "Ada",
    email: "ada@example.com",
    meat: true,
    vegetarian: true,
    vegan: true,
    fish: false,
    histamine: true,
    fructose: true,
    lactose: true,
    gluten: true,
    color: "#ff0000",
    language: "en",
    border_style: "solid",
    border_texture: null,
    glow_effect: false,
    experience_points: 100,
    level_id: 2,
    profile_picture: null,
});
