import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useGetMe } from "../../api/generated/endpoints/auth/auth";
import { rollPan, useListPans } from "../../api/generated/endpoints/pans/pans";
import { useGetUserProfile } from "../../api/generated/endpoints/users/users";
import type { MeDto, RollOutcomeDto } from "../../api/generated/model";
import { useAppStore } from "../../AppSlice";
import { useAuthStore } from "../../AuthSlice";
import { me, panPage, rollOutcome, userProfile } from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, Transport } from "../../lib/api/transport";
import { applyRollOutcome } from "./applyRollOutcome";

// The fixture user is the roller after the roll; this is them before it.
const user: MeDto = {
    ...me,
    experience_points: rollOutcome.reward.xp_before,
    level: rollOutcome.reward.previous_level,
    next_level: rollOutcome.reward.level,
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
    expect(user.id).toBe(rollOutcome.pan.user_id);

    applyRollOutcome(rollOutcome, "s1");

    // The backend's own view of the user after the roll.
    expect(useAuthStore.getState().user).toEqual(me);
});

it("keeps the known level when the reward has none", () => {
    applyRollOutcome(withReward({ level: null, next_level: null }), "s1");

    const updated = useAuthStore.getState().user!;
    expect(updated.level).toEqual(user.level);
    expect(updated.next_level).toBeNull();
});

it("shows the XP notification with the unlocked achievements", () => {
    applyRollOutcome(withReward({ leveled_up: false }), "s1");

    expect(useAppStore.getState().xpNotification).toEqual({
        visible: true,
        reward: { ...rollOutcome.reward, leveled_up: false },
        achievements: rollOutcome.achievements,
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

it("refetches the signed-in user and their profile", async () => {
    fake.on("GET", "/auth/me", me);
    fake.on("GET", `/users/${user.id}`, userProfile);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children);
    const signedIn = renderHook(() => useGetMe(), { wrapper });
    const profile = renderHook(() => useGetUserProfile(user.id), { wrapper });
    await waitFor(() => expect(signedIn.result.current.data).toEqual(me));
    await waitFor(() => expect(profile.result.current.data).toEqual(userProfile));
    const fetched = fake.requests.length;

    act(() => {
        applyRollOutcome(rollOutcome, "s1");
    });

    await waitFor(() => expect(fake.requests.length).toBeGreaterThanOrEqual(fetched + 2));
    expect(fake.requests.slice(fetched).map((r) => r.path)).toEqual(
        expect.arrayContaining(["/auth/me", `/users/${user.id}`]),
    );
});
