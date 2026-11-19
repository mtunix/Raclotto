import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { SessionDto } from "../api/generated/model";
import { useAppStore } from "../AppSlice";
import { session } from "../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../lib/api/fakeTransport";
import { setTransport, type Transport } from "../lib/api/transport";
import { useRouteSession } from "./useRouteSession";

const other: SessionDto = { ...session, id: session.id + 1, key: "s2", name: "s2" };

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

function render(sessionId: string) {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false } },
      children,
    );
  return renderHook(() => useRouteSession(sessionId), { wrapper });
}

it("stores the active session the URL names", async () => {
  fake.on("GET", "/sessions", [other, session]);

  const { result } = render(String(session.id));

  expect(result.current).toBe("loading");
  await waitFor(() => expect(result.current).toBe("ready"));
  expect(useAppStore.getState().session).toEqual(session);
  expect(fake.last("GET", "/sessions")?.query).toBeUndefined();
});

it("replaces another session in the store", async () => {
  useAppStore.getState().setSession(other);
  fake.on("GET", "/sessions", [other, session]);

  const { result } = render(String(session.id));

  await waitFor(() => expect(result.current).toBe("ready"));
  expect(useAppStore.getState().session?.id).toBe(session.id);
});

it("is ready at once when the store already holds the session", () => {
  useAppStore.getState().setSession(session);
  fake.on("GET", "/sessions", []);

  const { result } = render(String(session.id));

  expect(result.current).toBe("ready");
});

it("does not find a session missing from the active list", async () => {
  fake.on("GET", "/sessions", [other]);

  const { result } = render(String(session.id));

  await waitFor(() => expect(result.current).toBe("notFound"));
  expect(useAppStore.getState().session).toBeNull();
});

it("reports a failed list", async () => {
  fake.on("GET", "/sessions", () => {
    throw new Error("offline");
  });

  const { result } = render(String(session.id));

  await waitFor(() => expect(result.current).toBe("error"));
});
