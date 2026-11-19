import { type ReactNode, createElement } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useGetMe } from "../api/generated/endpoints/auth/auth";
import { useGetProfilePictureHistory } from "../api/generated/endpoints/images/images";
import { useListPans } from "../api/generated/endpoints/pans/pans";
import { useGetUserProfile } from "../api/generated/endpoints/users/users";
import type { MeDto, ProfilePictureDto } from "../api/generated/model";
import { useAuthStore } from "../AuthSlice";
import {
  generatedPicture,
  me,
  panPage,
  pictureHistory,
  userProfile,
} from "../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../lib/api/fakeTransport";
import { setTransport, type Transport } from "../lib/api/transport";
import { changeMyPicture, chooseCandidatePicture, generateMyPicture } from "./myProfilePicture";

const [current, older] = pictureHistory;

let fake: FakeTransport;
let previous: Transport;
let stored: ProfilePictureDto[];

beforeEach(() => {
  stored = pictureHistory;
  fake = new FakeTransport();
  previous = setTransport(fake);
  useAuthStore.setState({ user: me });
});

afterEach(() => {
  setTransport(previous);
});

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children);

const historyFetches = (userId: number) =>
  fake.requests.filter((r) => r.method === "GET" && r.path === `/images/profile-picture-history/${userId}`).length;

/** A user's history as the picture manager loads it; each test uses a user id of its own. */
async function renderHistory(userId: number) {
  fake.on("GET", `/images/profile-picture-history/${userId}`, () => stored);
  const { result } = renderHook(() => useGetProfilePictureHistory(userId), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual(pictureHistory));
  return result;
}

it("choosing a candidate posts for the picture and refetches the history", async () => {
  expect([current.is_candidate, older.is_candidate]).toEqual([true, false]);
  fake.on("POST", `/images/set-candidate-picture/${older.id}`, () => {
    stored = [{ ...current, is_candidate: false }, { ...older, is_candidate: true }];
    return undefined;
  });
  const result = await renderHistory(1);

  await act(() => chooseCandidatePicture(1, older.id));

  expect(fake.last("POST", `/images/set-candidate-picture/${older.id}`)).toEqual({
    method: "POST",
    path: `/images/set-candidate-picture/${older.id}`,
    query: undefined,
    body: undefined,
  });
  expect(historyFetches(1)).toBe(2);
  expect(result.current.data?.map((p) => [p.id, p.is_candidate])).toEqual([
    [current.id, false],
    [older.id, true],
  ]);
});

it("a refused choice refetches nothing", async () => {
  fake.on("POST", `/images/set-candidate-picture/${older.id}`, () => {
    throw new Error("403");
  });
  await renderHistory(2);

  await expect(chooseCandidatePicture(2, older.id)).rejects.toThrow("403");

  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(historyFetches(2)).toBe(1);
});

describe("changing the signed-in user's picture", () => {
  const picture = "data:image/png;base64,bmV3";
  const saved: ProfilePictureDto = { ...current, id: 3, is_candidate: false, profile_picture: picture };
  const after: MeDto = { ...me, profile_picture: picture };

  beforeEach(() => {
    fake
      .on("PATCH", "/auth/me", after)
      .on("GET", `/images/profile-picture-history/${me.id}`, () => [saved, ...pictureHistory])
      .on("POST", `/images/set-candidate-picture/${saved.id}`, undefined);
  });

  it("saves it, then makes it the one generation starts from", async () => {
    expect(await changeMyPicture(picture)).toEqual(after);

    expect(fake.requests.slice(0, 3).map((r) => `${r.method} ${r.path}`)).toEqual([
      "PATCH /auth/me",
      `GET /images/profile-picture-history/${me.id}`,
      `POST /images/set-candidate-picture/${saved.id}`,
    ]);
    expect(fake.last("PATCH", "/auth/me")?.body).toEqual({ profile_picture: picture });
    expect(useAuthStore.getState().user).toEqual(after);
  });

  it("leaves a picture that already is the candidate alone", async () => {
    fake.on("GET", `/images/profile-picture-history/${me.id}`, () => [{ ...saved, is_candidate: true }]);

    await changeMyPicture(picture);

    expect(fake.last("POST", `/images/set-candidate-picture/${saved.id}`)).toBeUndefined();
  });

  it("keeps the saved picture when it cannot become the candidate", async () => {
    fake.on("POST", `/images/set-candidate-picture/${saved.id}`, () => {
      throw new Error("403");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await changeMyPicture(picture)).toEqual(after);
    expect(useAuthStore.getState().user).toEqual(after);
  });

  it("refetches the user, their profile and history, and the pan lists", async () => {
    fake.on("GET", "/auth/me", after).on("GET", `/users/${me.id}`, userProfile).on("GET", "/pans", panPage);
    const hooks = [
      renderHook(() => useGetMe(), { wrapper }),
      renderHook(() => useGetUserProfile(me.id), { wrapper }),
      renderHook(() => useGetProfilePictureHistory(me.id), { wrapper }),
      renderHook(() => useListPans({ user_id: [me.id], limit: 1, offset: 0 }), { wrapper }),
    ];
    for (const hook of hooks) {
      await waitFor(() => expect(hook.result.current.data).toBeDefined());
    }
    const fetched = fake.requests.length;

    await act(() => changeMyPicture(picture));

    expect(fake.requests.slice(fetched).map((r) => r.path)).toEqual(
      expect.arrayContaining(["/auth/me", `/users/${me.id}`, "/pans"]),
    );
    // Once to find the saved picture, once refetched.
    expect(fake.requests.slice(fetched).filter((r) => r.path === `/images/profile-picture-history/${me.id}`)).toHaveLength(2);
  });
});

it("generating a picture refreshes the signed-in user from the backend", async () => {
  const after: MeDto = { ...me, profile_picture: `data:image/png;base64,${generatedPicture.image_base64}` };
  fake.on("POST", "/images/generate-profile-picture", generatedPicture).on("GET", "/auth/me", after);

  expect(await generateMyPicture(3)).toEqual(generatedPicture);

  expect(fake.last("POST", "/images/generate-profile-picture")?.body).toEqual({ level_id: 3 });
  expect(useAuthStore.getState().user).toEqual(after);
});
