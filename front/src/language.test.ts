import i18n, { followUserLanguage } from "./i18n";
import { useAuthStore } from "./AuthSlice";
import { me } from "./lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "./lib/api/fakeTransport";
import { setTransport, Transport } from "./lib/api/transport";

let previous: Transport;
let unfollow: () => void;

beforeAll(() => {
  unfollow = followUserLanguage();
});

afterAll(() => unfollow());

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage("de");
  useAuthStore.setState({ token: "t", userId: me.id, user: null, isLoadingUser: false });
  previous = setTransport(new FakeTransport().on("GET", "/auth/me", { ...me, language: "en" }));
});

afterEach(() => {
  setTransport(previous);
});

it("switches to the signed-in user's language once a reload has fetched them", async () => {
  await useAuthStore.getState().fetchUser();

  expect(i18n.language).toBe("en");
});

it("starts the next load in the language last shown", async () => {
  await useAuthStore.getState().fetchUser();

  jest.isolateModules(() => {
    const reloaded: typeof i18n = require("./i18n").default;
    expect(reloaded.language).toBe("en");
  });
});
