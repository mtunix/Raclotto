import { type ReactNode, createElement } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { events } from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../lib/api/transport";
import { dismissSessionEvent, useSessionEvents } from "./sessionEvents";

let fake: FakeTransport;
let previous: Transport;
let pending = events;

beforeEach(() => {
    pending = events;
    fake = new FakeTransport().on("GET", "/events", () => pending);
    previous = setTransport(fake);
});

afterEach(() => {
    setTransport(previous);
});

const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(SWRConfig, { value: { dedupingInterval: 0 } }, children);

const listed = (sessionKey: string) =>
    fake.requests.filter((r) => r.method === "GET" && r.path === "/events" && r.query?.session_key === sessionKey);

it("lists the session's pending events", async () => {
    const { result } = renderHook(() => useSessionEvents("list"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(events));
    expect(listed("list")).toHaveLength(1);
});

it("lists nothing without a session", async () => {
    const { result } = renderHook(() => useSessionEvents(""), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.data).toBeUndefined();
    expect(fake.requests).toEqual([]);
});

it("dismissing posts for the event and refetches the session's events", async () => {
    const [event] = events;
    fake.on("POST", `/events/${event.id}/dismiss`, () => {
        pending = [];
        return undefined;
    });
    const { result } = renderHook(() => useSessionEvents("dismiss"), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(events));

    await act(() => dismissSessionEvent("dismiss", event.id));

    expect(fake.last("POST", `/events/${event.id}/dismiss`)).toEqual({
        method: "POST", path: `/events/${event.id}/dismiss`, query: undefined, body: undefined,
    });
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(listed("dismiss")).toHaveLength(2);
});

it("a failed dismissal refetches nothing", async () => {
    fake.on("POST", "/events/999/dismiss", () => {
        throw new Error("404");
    });
    const { result } = renderHook(() => useSessionEvents("failed"), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(events));

    await expect(dismissSessionEvent("failed", 999)).rejects.toThrow("404");

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(listed("failed")).toHaveLength(1);
});
