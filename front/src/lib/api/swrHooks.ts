import useSWR, { mutate as swrMutate } from "swr";
import { getGetMeKey } from "../../api/generated/endpoints/auth/auth";
import {
    getGetAvailableCountsKey,
    getListIngredientsKey,
} from "../../api/generated/endpoints/ingredients/ingredients";
import { getListPansKey } from "../../api/generated/endpoints/pans/pans";
import { getListPreparationTypesKey } from "../../api/generated/endpoints/preparation-type/preparation-type";
import { getGetSessionByKeyKey } from "../../api/generated/endpoints/sessions/sessions";
import { getGetUserProfileKey } from "../../api/generated/endpoints/users/users";
import { Api } from "./index";
import { ApiError } from "./types";

export const onErrorRetry = (
    error: ApiError,
    key: string,
    config: unknown,
    revalidate: (options: { retryCount: number }) => void,
    { retryCount }: { retryCount: number },
) => {
    if (error.status === 404) return;

    if (retryCount >= 10) return;

    setTimeout(
        () => revalidate({ retryCount: retryCount + 1 }),
        200 * retryCount,
    );
};

// Cache key generators
const getStatsKey = (sessionKey?: string, isGlobal?: boolean) => ["stats", sessionKey || null, isGlobal || false];
const getLeaderboardKey = () => ["leaderboard"];
const getAchievementsKey = () => ["achievements"];
const getEventConfigsKey = (sessionKey?: string) => sessionKey ? ["eventConfigs", sessionKey] : ["eventConfigs"];
const getEventsKey = (sessionKey?: string) => sessionKey ? ["events", sessionKey] : null;

// Fetcher functions
const statsFetcher = ([, sessionKey, isGlobal]: [string, string | null, boolean]) =>
    Api.getStats(isGlobal ? undefined : (sessionKey || undefined));
const leaderboardFetcher = () => Api.getLeaderboard();
const achievementsFetcher = () => Api.listAchievements();
const eventConfigsFetcher = ([, sessionKey]: [string, string?]) => Api.getEventConfigs(sessionKey);
const eventsFetcher = ([, sessionKey]: [string, string]) => Api.getEvents(sessionKey);

// SWR Hooks
export function useStats(sessionKey?: string, isGlobal: boolean = false) {
    const key = getStatsKey(sessionKey, isGlobal);
    return useSWR(key, statsFetcher, {
        onErrorRetry: onErrorRetry,
        refreshInterval: 5000, // Poll every 5 seconds
        revalidateOnFocus: true,
        revalidateOnReconnect: true
    });
}

export function useLeaderboard() {
    const key = getLeaderboardKey();
    return useSWR(key, leaderboardFetcher, {
        onErrorRetry: onErrorRetry,
        refreshInterval: 5000, // Poll every 5 seconds
        revalidateOnFocus: true,
        revalidateOnReconnect: true
    });
}

export function useAchievements() {
    const key = getAchievementsKey();
    return useSWR(key, achievementsFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function useEventConfigs(sessionKey?: string) {
    const key = getEventConfigsKey(sessionKey);
    return useSWR(key, eventConfigsFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function useEvents(sessionKey?: string) {
    const key = getEventsKey(sessionKey);
    return useSWR(key, eventsFetcher, {
        onErrorRetry: onErrorRetry,
        refreshInterval: 10000, // Poll every 10 seconds (replaces manual polling)
        revalidateOnFocus: true,
        revalidateOnReconnect: true
    });
}

// Mutation helpers for cache invalidation
/** A session's ingredient list and available counts, which every catalog change alters. */
export function mutateIngredientCatalog(sessionKey: string) {
    return Promise.all([
        swrMutate(getListIngredientsKey({ session_key: sessionKey })),
        mutateAvailableCounts(sessionKey),
    ]);
}

export function mutatePrepTypes(sessionKey: string) {
    return swrMutate(getListPreparationTypesKey({ session_key: sessionKey }));
}

export function mutateMe() {
    return swrMutate(getGetMeKey());
}

export function mutateSession(sessionKey: string) {
    return swrMutate(getGetSessionByKeyKey({ session_key: sessionKey }));
}

export function mutateStats(sessionKey?: string, isGlobal: boolean = false) {
    const key = getStatsKey(sessionKey, isGlobal);
    return swrMutate(key);
}

export function mutateLeaderboard() {
    const key = getLeaderboardKey();
    return swrMutate(key);
}

export function mutateAchievements() {
    const key = getAchievementsKey();
    return swrMutate(key);
}

export function mutateEventConfigs(sessionKey?: string) {
    const key = getEventConfigsKey(sessionKey);
    return swrMutate(key);
}

export function mutateEvents(sessionKey?: string) {
    const key = getEventsKey(sessionKey);
    if (key) {
        return swrMutate(key);
    }
}

/** Every cached page of `listPans`, whatever its filter. */
export function mutatePanLists() {
    const [path] = getListPansKey();
    return swrMutate((key) => Array.isArray(key) && key[0] === path);
}

export function mutateUserProfile(userId?: number) {
    if (userId) {
        return swrMutate(getGetUserProfileKey(userId));
    }
}

export function mutateAvailableCounts(sessionKey: string) {
    return swrMutate(getGetAvailableCountsKey({ session_key: sessionKey }));
}
