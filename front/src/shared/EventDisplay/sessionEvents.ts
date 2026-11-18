import { dismissEvent, useListEvents } from "../../api/generated/endpoints/events/events";
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
