import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ProfilePictureDto } from "../../api/generated/model";
import { useAuthStore } from "../../AuthSlice";
import {
    generatedPicture,
    imageGeneration,
    imageGenerationUnavailable,
    me,
    panPage,
    pictureHistory,
    userProfile,
    userStats,
} from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../lib/api/transport";
import { renderRoutes } from "../../testUtils";
import { ProfileView } from "./ProfileView";

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport()
        .on("GET", `/users/${me.id}`, { ...userProfile, id: me.id })
        .on("GET", `/users/${me.id}/stats`, userStats)
        .on("GET", "/pans", { ...panPage, items: [], total: 0, has_more: false })
        .on("GET", "/images/generation", imageGeneration);
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

it("shows the signed-in user's own profile with their email, statistics and pans", async () => {
    fake.on("GET", "/pans", { ...panPage, has_more: false });
    renderRoutes([{ path: "/profile/:userId?", element: <ProfileView /> }], "/profile");

    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("image.regeneratePicture")).toBeInTheDocument();
    expect(screen.getByText("Gotta eat'em all!")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 4, name: panPage.items[0].name ?? "" })).toBeInTheDocument();
    expect(screen.queryByText("history.loadMore")).not.toBeInTheDocument();
    expect(fake.last("GET", "/pans")?.query).toMatchObject({ user_id: [me.id] });
});

it("shows someone else's profile without their email or picture actions", async () => {
    fake.on("GET", "/users/5", { ...userProfile, id: 5, name: "Bob" })
        .on("GET", "/users/5/stats", userStats);
    renderRoutes([{ path: "/profile/:userId?", element: <ProfileView /> }], "/profile/5");

    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("image.regeneratePicture")).not.toBeInTheDocument();
    expect(screen.queryByText("profile.clickToChange")).not.toBeInTheDocument();
    expect(fake.last("GET", "/pans")?.query).toMatchObject({ user_id: [5] });
});

it("says so for a user that does not exist", async () => {
    fake.on("GET", "/users/9", () => Promise.reject(Object.assign(new Error("404"), { status: 404 })))
        .on("GET", "/users/9/stats", () => Promise.reject(Object.assign(new Error("404"), { status: 404 })));
    renderRoutes([{ path: "/profile/:userId?", element: <ProfileView /> }], "/profile/9");

    expect(await screen.findByText("profile.userNotFound")).toBeInTheDocument();
});

it("regenerates the picture for the user's level", async () => {
    fake.on("POST", "/images/generate-profile-picture", generatedPicture).on("GET", "/auth/me", me);
    renderRoutes([{ path: "/profile/:userId?", element: <ProfileView /> }], "/profile");

    const regenerate = (await screen.findByText("image.regeneratePicture")).closest("button") as HTMLElement;
    await waitFor(() => expect(regenerate).toBeEnabled());
    fireEvent.click(regenerate);

    expect(await screen.findByText("profile.pictureUpdated")).toBeInTheDocument();
    expect(fake.last("POST", "/images/generate-profile-picture")?.body).toEqual({ level_id: userProfile.level?.id });
});

it("offers no regenerating when the server can't generate pictures, and says why", async () => {
    fake.on("GET", "/images/generation", imageGenerationUnavailable);
    renderRoutes([{ path: "/profile/:userId?", element: <ProfileView /> }], "/profile");

    expect(await screen.findByText("image.generationUnavailable")).toBeInTheDocument();
    expect(screen.getByText("image.regeneratePicture").closest("button")).toBeDisabled();
    expect(fake.last("POST", "/images/generate-profile-picture")).toBeUndefined();
});
