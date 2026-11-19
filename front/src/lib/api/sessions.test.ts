import {
  closeSession,
  createSession,
  getSessionByKey,
  listSessions,
  reactivateSession,
  updateSession,
} from "../../api/generated/endpoints/sessions/sessions";
import type { SessionDto } from "../../api/generated/model";
import { useAppStore } from "../../AppSlice";
import { session, sessions } from "./__fixtures__/backendResponses";
import { FakeTransport } from "./fakeTransport";
import { setTransport, type Transport } from "./transport";

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
  fake = new FakeTransport();
  previous = setTransport(fake);
  useAppStore.getState().clearSession();
});

afterEach(() => {
  setTransport(previous);
});

it("creates a session from its name and stores it as sent", async () => {
  fake.on("POST", "/sessions", session);

  const created: SessionDto = await createSession({ name: "Friday" });
  useAppStore.getState().setSession(created);

  expect(fake.last("POST", "/sessions")).toEqual({
    method: "POST",
    path: "/sessions",
    query: undefined,
    body: { name: "Friday" },
  });
  expect(useAppStore.getState().session).toEqual(session);
  expect(typeof useAppStore.getState().session?.timestamp).toBe("string");
});

it("lists active sessions without a query and every session on request", async () => {
  fake.on("GET", "/sessions", sessions);

  expect(await listSessions()).toEqual(sessions);
  expect(fake.last("GET", "/sessions")?.query).toBeUndefined();
  await listSessions({ include_inactive: true });
  expect(fake.last("GET", "/sessions")?.query).toEqual({ include_inactive: true });
});

it("finds a session by its key in the query", async () => {
  fake.on("GET", "/sessions/by-key", session);

  expect(await getSessionByKey({ session_key: session.key })).toEqual(session);
  expect(fake.last("GET", "/sessions/by-key")?.query).toEqual({ session_key: session.key });
});

it("renames, closes and reactivates with plain bodies", async () => {
  fake.on("PATCH", `/sessions/${session.id}`, { ...session, name: "Saturday" });
  fake.on("POST", "/sessions/close", { ...session, active: false });
  fake.on("POST", "/sessions/reactivate", session);

  expect((await updateSession(session.id, { name: "Saturday" })).name).toBe("Saturday");
  expect((await closeSession({ key: session.key })).active).toBe(false);
  expect((await reactivateSession({ key: session.key })).active).toBe(true);

  expect(fake.last("PATCH", `/sessions/${session.id}`)?.body).toEqual({ name: "Saturday" });
  expect(fake.last("POST", "/sessions/close")?.body).toEqual({ key: session.key });
  expect(fake.last("POST", "/sessions/reactivate")?.body).toEqual({ key: session.key });
});
