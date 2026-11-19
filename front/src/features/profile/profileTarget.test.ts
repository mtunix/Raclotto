import { profileTarget } from "./profileTarget";

it("shows the signed-in user without a user in the path", () => {
  expect(profileTarget(undefined, 1)).toEqual({ userId: 1, isOwnProfile: true });
});

it("shows the user in the path", () => {
  expect(profileTarget("5", 1)).toEqual({ userId: 5, isOwnProfile: false });
});

it("knows the signed-in user's own id in the path", () => {
  expect(profileTarget("1", 1)).toEqual({ userId: 1, isOwnProfile: true });
});

it("has no user to show while signed out without one in the path", () => {
  expect(profileTarget(undefined, undefined)).toEqual({ userId: 0, isOwnProfile: true });
});
