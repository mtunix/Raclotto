import { type ReactNode, createElement } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useListAchievements } from "../../api/generated/endpoints/achievements/achievements";
import { useListPans } from "../../api/generated/endpoints/pans/pans";
import { useGetUserProfile } from "../../api/generated/endpoints/users/users";
import type { PanDto } from "../../api/generated/model";
import { useAuthStore } from "../../AuthSlice";
import {
    achievementStatuses,
    me,
    panPage,
    rating,
    userProfile,
} from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../lib/api/transport";
import { ratePan } from "./ratePan";

const author = 7;
const pan: PanDto = { ...panPage.items[0], user_id: author };

let fake: FakeTransport;
let previous: Transport;

const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children);

beforeEach(() => {
    fake = new FakeTransport()
        .on("POST", "/ratings", { ...rating, pan_id: pan.id, rating: 3 })
        .on("GET", `/pans/${pan.id}`, { ...pan, rating: 3.5 });
    previous = setTransport(fake);
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

it("rates the pan as the signed-in user and resolves to its new average", async () => {
    const fresh = await ratePan(pan.id, 3);

    expect(fake.last("POST", "/ratings")?.body).toEqual({ pan_id: pan.id, rating: 3 });
    expect(fresh.rating).toBe(3.5);
});

it("refetches pan lists, achievements and the rater's and author's profiles", async () => {
    fake.on("GET", "/pans", panPage)
        .on("GET", "/achievements", achievementStatuses)
        .on("GET", `/users/${me.id}`, userProfile)
        .on("GET", `/users/${author}`, userProfile);
    const hooks = [
        renderHook(() => useListPans({ session_key: "s1", limit: 1, offset: 0 }), { wrapper }),
        renderHook(() => useListAchievements(), { wrapper }),
        renderHook(() => useGetUserProfile(me.id), { wrapper }),
        renderHook(() => useGetUserProfile(author), { wrapper }),
    ];
    for (const hook of hooks) {
        await waitFor(() => expect(hook.result.current.data).toBeDefined());
    }
    const fetched = fake.requests.length;

    await ratePan(pan.id, 3);

    await waitFor(() =>
        expect(fake.requests.slice(fetched).map((r) => r.path)).toEqual(
            expect.arrayContaining(["/pans", "/achievements", `/users/${me.id}`, `/users/${author}`]),
        ),
    );
});

it("rejects without refetching anything when the rating fails", async () => {
    fake.on("POST", "/ratings", () => {
        throw new Error("nope");
    });

    await expect(ratePan(pan.id, 3)).rejects.toThrow("nope");
    expect(fake.last("GET", `/pans/${pan.id}`)).toBeUndefined();
});
