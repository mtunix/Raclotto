import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ProfilePictureDto } from "../../api/generated/model";
import { useAuthStore } from "../../AuthSlice";
import { me, panPage, pictureHistory, userProfile, userStats } from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, Transport } from "../../lib/api/transport";
import { renderRoutes } from "../../testUtils";
import { ProfileView } from "./ProfileView";

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport()
        .on("GET", `/users/${me.id}`, { ...userProfile, id: me.id })
        .on("GET", `/users/${me.id}/stats`, userStats)
        .on("GET", "/pans", { ...panPage, items: [], total: 0, has_more: false });
    previous = setTransport(fake);
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

it("makes a slowly saved picture the candidate once it is saved", async () => {
    const removed: ProfilePictureDto = { ...pictureHistory[1], id: 3, is_candidate: false, profile_picture: null };
    let history = pictureHistory;
    fake.on("GET", `/images/profile-picture-history/${me.id}`, () => history)
        .on("PATCH", "/auth/me", () => new Promise((resolve) => setTimeout(() => {
            history = [removed, ...pictureHistory];
            resolve({ ...me, profile_picture: null });
        }, 800)))
        .on("POST", `/images/set-candidate-picture/${removed.id}`, undefined)
        .on("GET", "/auth/me", { ...me, profile_picture: null });
    renderRoutes([{ path: "/profile/:userId?", element: <ProfileView /> }], "/profile");

    fireEvent.click(await screen.findByText("profile.clickToChange"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByText("auth.removePhoto"));
    fireEvent.click(within(dialog).getByText("common.save"));

    await waitFor(() => expect(fake.last("POST", `/images/set-candidate-picture/${removed.id}`)).toBeDefined(), {
        timeout: 3000,
    });
    expect(fake.last("PATCH", "/auth/me")?.body).toEqual({ profile_picture: null });
    expect(useAuthStore.getState().user?.profile_picture).toBeNull();
});
