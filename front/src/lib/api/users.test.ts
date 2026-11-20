import {
  getMe,
  login,
  lookupInvite,
  register,
  updateMe,
} from "../../api/generated/endpoints/auth/auth";
import {
  createInvite,
  listInvites,
  revokeInvite,
} from "../../api/generated/endpoints/invites/invites";
import { getUserProfile, getUserStats } from "../../api/generated/endpoints/users/users";
import type { MeDto, UpdateMeBody } from "../../api/generated/model";
import { useAuthStore } from "../../AuthSlice";
import { normalizeDiet } from "../../model/diet";
import {
  invite,
  loginResult,
  me,
  userProfile,
  userStats,
} from "./__fixtures__/backendResponses";
import { FakeTransport } from "./fakeTransport";
import { setTransport, type Transport } from "./transport";

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
  fake = new FakeTransport();
  previous = setTransport(fake);
  useAuthStore.getState().logout();
});

afterEach(() => {
  setTransport(previous);
});

describe("signing in", () => {
  it("logs in with a plain body and stores the token and the returned user", async () => {
    fake.on("POST", "/auth/login", loginResult);

    const { token, user } = await login({ name_or_email: "Ada", password: "secret" });
    useAuthStore.getState().login(token, user);

    expect(fake.last("POST", "/auth/login")?.body).toEqual({ name_or_email: "Ada", password: "secret" });
    const state = useAuthStore.getState();
    expect(state).toMatchObject({ token: loginResult.token, userId: loginResult.user.id, isAuthenticated: true });
    expect(state.user).toEqual(loginResult.user);
    expect(localStorage.getItem("auth_token")).toBe(loginResult.token);
    expect(localStorage.getItem("auth_user_id")).toBe(String(loginResult.user.id));
  });

  it("registers with the invite token and gets the same result shape", async () => {
    fake.on("POST", "/auth/register", loginResult);

    const result = await register({
      token: "tok",
      email: "ada@example.com",
      name: "Ada",
      password: "secret",
    });

    expect(fake.last("POST", "/auth/register")?.body).toEqual({
      token: "tok",
      email: "ada@example.com",
      name: "Ada",
      password: "secret",
    });
    expect(result.user.id).toBe(loginResult.user.id);
  });

  it("looks an invite up by its encoded token", async () => {
    fake.on("GET", "/auth/invite/a%2Fb", { expires_at: "2026-11-25T12:00:00" });

    const found = await lookupInvite(encodeURIComponent("a/b"));

    expect(found.expires_at).toBe("2026-11-25T12:00:00");
  });

  it("logout clears what login stored", () => {
    useAuthStore.getState().login(loginResult.token, loginResult.user);
    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null, userId: null, isAuthenticated: false });
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("auth_user_id")).toBeNull();
  });
});

describe("the signed-in user", () => {
  it("fetchUser loads the user through the transport", async () => {
    fake.on("GET", "/auth/me", me);
    useAuthStore.setState({ token: "jwt", userId: me.id, isAuthenticated: true });

    await useAuthStore.getState().fetchUser();

    expect(fake.last("GET", "/auth/me")).toBeDefined();
    expect(useAuthStore.getState().user).toEqual(me);
    expect(await getMe()).toEqual(me);
  });

  it("updateMe sends only the changed fields and returns the whole user", async () => {
    const changed: MeDto = { ...me, meat: false, vegetarian: true, vegan: true, language: "en" };
    fake.on("PATCH", "/auth/me", changed);
    const body: UpdateMeBody = {
      ...normalizeDiet({ meat: false, vegetarian: true, vegan: false }),
      language: "en",
    };

    const updated = await updateMe(body);

    expect(fake.last("PATCH", "/auth/me")?.body).toEqual({
      meat: false,
      vegetarian: true,
      vegan: true,
      language: "en",
    });
    expect(updated).toEqual(changed);
    expect(updated.level).toEqual(me.level);
  });
});

describe("profiles and stats", () => {
  it("a profile carries no email or diet", async () => {
    fake.on("GET", `/users/${userProfile.id}`, userProfile);

    const profile = await getUserProfile(userProfile.id);

    expect(profile).toEqual(userProfile);
    expect(profile).not.toHaveProperty("email");
    expect(profile).not.toHaveProperty("meat");
    expect(profile.achievements.length).toBeGreaterThan(0);
  });

  it("stats embed full pans and ingredients", async () => {
    fake.on("GET", `/users/${userProfile.id}/stats`, userStats);

    const stats = await getUserStats(userProfile.id);

    expect(stats.most_ingredients_pan?.author?.name).toBe("Ada");
    expect(stats.best_rated_ingredient?.ingredient.name).toEqual(expect.any(String));
    expect(stats.best_rated_ingredient?.avg_rating).toEqual(expect.any(Number));
  });
});

describe("invites", () => {
  it("creates, lists and revokes invites", async () => {
    fake.on("POST", "/invites", invite);
    fake.on("GET", "/invites", [invite]);
    fake.on("DELETE", `/invites/${invite.id}`, undefined);

    expect(await createInvite()).toEqual(invite);
    expect(await listInvites()).toEqual([invite]);
    await revokeInvite(invite.id);

    expect(fake.last("POST", "/invites")?.body).toBeUndefined();
    expect(fake.last("DELETE", `/invites/${invite.id}`)).toBeDefined();
  });
});
