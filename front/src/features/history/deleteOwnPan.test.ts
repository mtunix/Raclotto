import { type ReactNode, createElement } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useListAchievements } from "../../api/generated/endpoints/achievements/achievements";
import { useGetPanFilterOptions, useListPans } from "../../api/generated/endpoints/pans/pans";
import { useGetSessionRecap } from "../../api/generated/endpoints/sessions/sessions";
import { useGetStats } from "../../api/generated/endpoints/stats/stats";
import { useGetUserProfile, useGetUserStats } from "../../api/generated/endpoints/users/users";
import type { PanDto } from "../../api/generated/model";
import {
    achievementStatuses,
    me,
    panFilterOptions,
    panPage,
    sessionRecap,
    stats,
    userProfile,
    userStats,
} from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../lib/api/transport";
import { deleteOwnPan } from "./deleteOwnPan";

const pan: PanDto = { ...panPage.items[0], user_id: me.id };

let fake: FakeTransport;
let previous: Transport;

const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children);

beforeEach(() => {
    fake = new FakeTransport().on("DELETE", `/pans/${pan.id}`, undefined);
    previous = setTransport(fake);
});

afterEach(() => {
    setTransport(previous);
});

it("deletes the pan", async () => {
    await deleteOwnPan(pan);

    expect(fake.last("DELETE", `/pans/${pan.id}`)).toBeDefined();
});

it("refetches what counted the pan, but leaves the pan lists to the caller", async () => {
    fake.on("GET", "/pans", panPage)
        .on("GET", "/pans/filters", panFilterOptions)
        .on("GET", "/stats", stats)
        .on("GET", "/sessions/recap", sessionRecap)
        .on("GET", "/achievements", achievementStatuses)
        .on("GET", `/users/${me.id}`, userProfile)
        .on("GET", `/users/${me.id}/stats`, userStats);
    const hooks = [
        renderHook(() => useListPans({ session_key: "deleted", limit: 1, offset: 0 }), { wrapper }),
        renderHook(() => useGetPanFilterOptions({ session_key: "deleted" }), { wrapper }),
        renderHook(() => useGetStats({ session_key: "deleted" }), { wrapper }),
        renderHook(() => useGetSessionRecap({ session_key: "deleted" }), { wrapper }),
        renderHook(() => useListAchievements(), { wrapper }),
        renderHook(() => useGetUserProfile(me.id), { wrapper }),
        renderHook(() => useGetUserStats(me.id), { wrapper }),
    ];
    for (const hook of hooks) {
        await waitFor(() => expect(hook.result.current.data).toBeDefined());
    }
    const fetched = fake.requests.length;

    await act(() => deleteOwnPan(pan));

    const refetched = () => fake.requests.slice(fetched).filter((r) => r.method === "GET").map((r) => r.path);
    await waitFor(() =>
        expect(refetched()).toEqual(
            expect.arrayContaining([
                "/pans/filters",
                "/stats",
                "/sessions/recap",
                "/achievements",
                `/users/${me.id}`,
                `/users/${me.id}/stats`,
            ]),
        ),
    );
    expect(refetched()).not.toContain("/pans");
});

it("rejects without refetching anything when the delete fails", async () => {
    fake.on("DELETE", `/pans/${pan.id}`, () => {
        throw new Error("nope");
    });

    await expect(deleteOwnPan(pan)).rejects.toThrow("nope");
    expect(fake.requests).toHaveLength(1);
});
