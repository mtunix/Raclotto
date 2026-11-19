import { dismissEvent, useListEvents } from "../../api/generated/endpoints/events/events";
import { EventType, type EventDto } from "../../api/generated/model";
import { mutateEvents, onErrorRetry } from "../../lib/api/swrHooks";

/** The session's events the signed-in user has not dismissed, newest first; polled every 10 seconds. */
export function useSessionEvents(sessionKey: string) {
    return useListEvents({ session_key: sessionKey }, {
        swr: {
            enabled: !!sessionKey,
            onErrorRetry,
            refreshInterval: 10000,
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
        },
    });
}

/** Hides the event from the signed-in user, then refetches the session's events. */
export async function dismissSessionEvent(sessionKey: string, eventId: number): Promise<void> {
    await dismissEvent(eventId);
    await mutateEvents(sessionKey);
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

const isText = (value: unknown): value is string => typeof value === "string";

/** The event's announcement in the UI's language, from its type and data; events of other types or shapes get a generic one. */
export function eventMessage({ event_type, data }: Pick<EventDto, "event_type" | "data">, t: Translate): string {
    if (event_type === EventType.pan_swap && data) {
        const { pan1_user_name: first, pan2_user_name: second, time_window_minutes: count } = data;
        if (isText(first) && isText(second) && typeof count === "number") {
            return t("events.types.pan_swap.message", { first, second, count });
        }
    }
    return t("events.unknown.message");
}
