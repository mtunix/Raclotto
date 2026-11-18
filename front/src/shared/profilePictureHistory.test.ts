import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useGetProfilePictureHistory } from "../api/generated/endpoints/images/images";
import type { ProfilePictureDto } from "../api/generated/model";
import { pictureHistory } from "../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../lib/api/fakeTransport";
import { setTransport, Transport } from "../lib/api/transport";
import { chooseCandidatePicture } from "./profilePictureHistory";

const [current, older] = pictureHistory;

let fake: FakeTransport;
let previous: Transport;
let stored: ProfilePictureDto[];

beforeEach(() => {
  stored = pictureHistory;
  fake = new FakeTransport();
  previous = setTransport(fake);
});

afterEach(() => {
  setTransport(previous);
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children);

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
