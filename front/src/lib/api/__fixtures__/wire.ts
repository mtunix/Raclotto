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

/** Pan attributes as `Pan.as_dict()` produces them (GET /stats). */
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
