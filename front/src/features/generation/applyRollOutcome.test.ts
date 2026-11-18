import { useAppStore } from "../../AppSlice";
import { useAuthStore } from "../../AuthSlice";
import { RollOutcome } from "../../model/rollOutcome";
import { User } from "../../model/user";
import { applyRollOutcome } from "./applyRollOutcome";

const user: User = {
    id: 7,
    name: "Ada",
    email: "ada@example.com",
    meat: false,
    vegetarian: true,
    vegan: true,
    fish: false,
    histamine: true,
    fructose: true,
    lactose: true,
    gluten: true,
    experience_points: 100,
    level: { id: 2, name: "Cook", required_experience: 100 },
    next_level: { id: 3, name: "Chef", required_experience: 140 },
};

const outcome = (leveledUp: boolean, xpGained = 42): RollOutcome => ({
    pan: {
        id: 11,
        name: "Pan",
        user: "",
        timestamp: "",
        snacked: false,
        ingredients: [],
        ratings: [],
        rating: 0,
    },
    reward: {
        xp_gained: xpGained,
        xp_before: 100,
        xp_after: 100 + xpGained,
        level: leveledUp
            ? { id: 3, name: "Chef", required_experience: 140 }
            : { id: 2, name: "Cook", required_experience: 100 },
        previous_level: { id: 2, name: "Cook", required_experience: 100 },
        next_level: leveledUp
            ? { id: 4, name: "Master", required_experience: 300 }
            : { id: 3, name: "Chef", required_experience: 140 },
        leveled_up: leveledUp,
    },
    achievements: [
        { id: 3, title: "First Pan", description: "", value: 10, hidden: false },
    ],
    events: [],
});

beforeEach(() => {
    useAuthStore.setState({ user });
    useAppStore.getState().hideXpNotification();
});

it("updates the signed-in user's XP and level from the reward", () => {
    applyRollOutcome(outcome(true), "sess");

    const updated = useAuthStore.getState().user!;
    expect(updated.experience_points).toBe(142);
    expect(updated.level?.id).toBe(3);
    expect(updated.next_level?.id).toBe(4);
    expect(updated.name).toBe("Ada");
});

it("shows the XP notification with the unlocked achievements", () => {
    applyRollOutcome(outcome(false), "sess");

    expect(useAppStore.getState().xpNotification).toMatchObject({
        visible: true,
        xpGained: 42,
        oldXP: 100,
        newXP: 142,
        levelUp: false,
        level: { id: 2 },
        nextLevel: { id: 3 },
        achievements: [{ id: 3, title: "First Pan" }],
    });
});

it("reports a level-up with the reached level", () => {
    expect(applyRollOutcome(outcome(true), "sess")).toEqual({ leveledUp: true, newLevelId: 3 });
    expect(applyRollOutcome(outcome(false), "sess")).toEqual({ leveledUp: false });
});

it("does not notify when no XP was gained", () => {
    applyRollOutcome(outcome(false, 0), "sess");
    expect(useAppStore.getState().xpNotification.visible).toBe(false);
});
