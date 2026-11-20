import { type ReactNode, createElement } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { events } from "../../lib/api/__fixtures__/backendResponses";
import { FakeTransport } from "../../lib/api/fakeTransport";
import { setTransport, type Transport } from "../../lib/api/transport";
import { dismissSessionEvent, eventMessage, useSessionEvents } from "./sessionEvents";

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

it("announces a pan swap in the UI's words, with the two cooks and the window", () => {
    const t = (key: string, options?: Record<string, unknown>) => `${key} ${JSON.stringify(options)}`;

    expect(eventMessage(events[0], t)).toBe('events.types.pan_swap.message {"first":"Ada","second":"Ben","count":10}');
});

it("announces events of other types or shapes generically", () => {
    const t = (key: string) => key;

    expect(eventMessage({ event_type: "rain", data: { mm: 3 } }, t)).toBe("events.unknown.message");
    expect(eventMessage({ event_type: "pan_swap", data: { pan1_id: 1 } }, t)).toBe("events.unknown.message");
    expect(eventMessage({ event_type: "pan_swap", data: null }, t)).toBe("events.unknown.message");
});

it("announces a new ingredient of the hour by its name", () => {
    const t = (key: string, options?: Record<string, unknown>) => `${key} ${JSON.stringify(options)}`;
    const hour = { event_type: "ingredient_of_the_hour", data: { ingredient_id: 3, ingredient_name: "Leek" } };

    expect(eventMessage(hour, t)).toBe('events.types.ingredient_of_the_hour.message {"ingredient":"Leek"}');
    expect(eventMessage({ ...hour, data: { ingredient_id: 3 } }, (key: string) => key)).toBe("events.unknown.message");
});

it("reads in German and English through the real translations, plural and all", async () => {
    const { default: i18n } = await import("../../i18n");
    const swap = { event_type: "pan_swap", data: { pan1_user_name: "Ada", pan2_user_name: "Ben", time_window_minutes: 10 } };
    const hour = { event_type: "ingredient_of_the_hour", data: { ingredient_id: 3, ingredient_name: "Lauch" } };

    expect(eventMessage(swap, i18n.getFixedT("de"))).toBe(
        "Tauschen Sie Ihre Pfannen! Ada und Ben haben innerhalb von 10 Minuten je eine Pfanne gezogen.",
    );
    expect(eventMessage({ ...swap, data: { ...swap.data, time_window_minutes: 1 } }, i18n.getFixedT("en"))).toBe(
        "Swap your pans! Ada and Ben rolled pans within 1 minute of each other.",
    );
    expect(eventMessage(hour, i18n.getFixedT("de"))).toBe("Neue Zutat der Stunde: Lauch. Bonus-XP für jede Pfanne damit!");
});
