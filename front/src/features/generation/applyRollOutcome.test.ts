import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { rollPan, useListPans } from "../../api/generated/endpoints/pans/pans";
import type { RollOutcomeDto } from "../../api/generated/model";
import { useAppStore } from "../../AppSlice";
import { useAuthStore } from "../../AuthSlice";
import { panPage, rollOutcome } from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, Transport } from "../../lib/api/transport";
import { User } from "../../model/user";
import { applyRollOutcome } from "./applyRollOutcome";

const user: User = {
    id: rollOutcome.pan.user_id,
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
    experience_points: 95,
    level: { id: 1, name: "level.one", required_experience: 0 },
    next_level: { id: 2, name: "level.two", required_experience: 100 },
};

// The fixture is a real level-up roll; these variants change only the reward.
const withReward = (reward: Partial<RollOutcomeDto["reward"]>): RollOutcomeDto => ({
    ...rollOutcome,
    reward: { ...rollOutcome.reward, ...reward },
});

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport();
    previous = setTransport(fake);
    useAuthStore.setState({ user });
    useAppStore.getState().hideXpNotification();
});

afterEach(() => {
    setTransport(previous);
});

it("applies a roll response as the backend sends it", async () => {
    fake.on("POST", "/pans/generate", rollOutcome);

    const outcome = await rollPan({ num_fill: 2, num_sauce: 1 }, { session_key: "s1" });
    const levelUp = applyRollOutcome(outcome, "s1");

    expect(fake.last("POST", "/pans/generate")).toEqual({
        method: "POST",
        path: "/pans/generate",
        query: { session_key: "s1" },
        body: { num_fill: 2, num_sauce: 1 },
    });
    expect(outcome.pan.author?.name).toBe("Ada");
    expect(levelUp).toEqual({ leveledUp: true, newLevelId: rollOutcome.reward.level?.id });
});

it("updates the signed-in user's XP and level from the reward", () => {
    applyRollOutcome(rollOutcome, "s1");

    const updated = useAuthStore.getState().user!;
    expect(updated.experience_points).toBe(rollOutcome.reward.xp_after);
    expect(updated.level?.id).toBe(rollOutcome.reward.level?.id);
    expect(updated.next_level?.id).toBe(rollOutcome.reward.next_level?.id);
    expect(updated.name).toBe("Ada");
});

it("shows the XP notification with the unlocked achievements", () => {
    applyRollOutcome(withReward({ leveled_up: false }), "s1");

    const { reward, achievements } = rollOutcome;
    expect(useAppStore.getState().xpNotification).toMatchObject({
        visible: true,
        xpGained: reward.xp_gained,
        oldXP: reward.xp_before,
        newXP: reward.xp_after,
        levelUp: false,
        level: { id: reward.level?.id },
        nextLevel: { id: reward.next_level?.id },
        achievements: achievements.map(({ id, title }) => expect.objectContaining({ id, title })),
    });
});

it("reports a level-up only when the reward says so", () => {
    expect(applyRollOutcome(withReward({ leveled_up: false }), "s1")).toEqual({ leveledUp: false });
    expect(applyRollOutcome(withReward({ level: null }), "s1")).toEqual({ leveledUp: false });
});

it("does not notify when no XP was gained", () => {
    applyRollOutcome(withReward({ xp_gained: 0 }), "s1");
    expect(useAppStore.getState().xpNotification.visible).toBe(false);
});

it("refetches every cached pan list", async () => {
    fake.on("GET", "/pans", panPage);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children);
    const session = renderHook(() => useListPans({ session_key: "s1", limit: 1, offset: 0 }), { wrapper });
    const author = renderHook(() => useListPans({ user_id: user.id, limit: 1, offset: 0 }), { wrapper });
    await waitFor(() => expect(session.result.current.data).toEqual(panPage));
    await waitFor(() => expect(author.result.current.data).toEqual(panPage));
    const fetched = fake.requests.length;

    act(() => {
        applyRollOutcome(rollOutcome, "s1");
    });

    await waitFor(() => expect(fake.requests.length).toBe(fetched + 2));
    expect(fake.requests.slice(fetched).map((r) => r.query)).toEqual(
        expect.arrayContaining([
            { session_key: "s1", limit: 1, offset: 0 },
            { user_id: user.id, limit: 1, offset: 0 },
        ]),
    );
});
