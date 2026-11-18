import { useEffect } from "react";
import { useListSessions } from "../api/generated/endpoints/sessions/sessions";
import { useAppStore } from "../AppSlice";
import { onErrorRetry } from "../lib/api/swrHooks";

export type RouteSessionStatus = "ready" | "loading" | "error" | "notFound";

/**
 * Puts the active session the URL's `sessionId` names into the store. "ready" once the store
 * holds it; a closed or unknown session is "notFound".
 */
export function useRouteSession(sessionId: string | undefined): RouteSessionStatus {
    const { data: sessions, isLoading, error } = useListSessions(undefined, { swr: { onErrorRetry } });
    const storeSession = useAppStore((state) => state.session);
    const setSession = useAppStore((state) => state.setSession);

    const inStore = storeSession !== null && String(storeSession.id) === sessionId;
    const found = sessionId ? sessions?.find((s) => String(s.id) === sessionId) : undefined;

    useEffect(() => {
        if (!inStore && found) {
            setSession(found);
        }
    }, [inStore, found, setSession]);

    if (inStore) return "ready";
    if (isLoading) return "loading";
    if (error) return "error";
    if (sessions !== undefined && !found) return "notFound";
    // Found: the effect is storing it.
    return "loading";
}
