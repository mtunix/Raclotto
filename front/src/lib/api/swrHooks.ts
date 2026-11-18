import useSWR, { mutate as swrMutate } from "swr";
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
const getIngredientsKey = (sessionKey?: string) => sessionKey ? ["ingredients", sessionKey] : null;
const getPrepTypesKey = (sessionKey?: string) => sessionKey ? ["prepTypes", sessionKey] : null;
const getCurrentUserKey = () => ["currentUser"];
const getSessionKey = (sessionKey?: string) => sessionKey ? ["session", sessionKey] : null;
const getStatsKey = (sessionKey?: string, isGlobal?: boolean) => ["stats", sessionKey || null, isGlobal || false];
const getLeaderboardKey = () => ["leaderboard"];
const getAchievementsKey = () => ["achievements"];
const getEventConfigsKey = (sessionKey?: string) => sessionKey ? ["eventConfigs", sessionKey] : ["eventConfigs"];
const getEventsKey = (sessionKey?: string) => sessionKey ? ["events", sessionKey] : null;
const getPansPaginatedKey = (sessionKey?: string, limit?: number, offset?: number) => 
    sessionKey ? ["pansPaginated", sessionKey, limit, offset] : null;
const getPansByUserKey = (userId?: number, limit?: number, offset?: number) => 
    userId ? ["pansByUser", userId, limit, offset] : null;
export const getAvailableCountsKey = (sessionKey?: string) => sessionKey ? ["availableCounts", sessionKey] : null;
const getInvitesKey = () => ["invites"];
const getUserProfileKey = (userId: number) => ["userProfile", userId];
const getUserStatsKey = (userId: number) => ["userStats", userId];

// Fetcher functions
const ingredientsFetcher = ([, sessionKey]: [string, string]) => Api.listIngredients(sessionKey);
const prepTypesFetcher = ([, sessionKey]: [string, string]) => Api.listPrepTypes(sessionKey);
const currentUserFetcher = () => Api.getCurrentUser();
const sessionFetcher = ([, sessionKey]: [string, string]) => Api.getSessionByKey(sessionKey);
const statsFetcher = ([, sessionKey, isGlobal]: [string, string | null, boolean]) =>
    Api.getStats(isGlobal ? undefined : (sessionKey || undefined));
const leaderboardFetcher = () => Api.getLeaderboard();
const achievementsFetcher = () => Api.listAchievements();
const eventConfigsFetcher = ([, sessionKey]: [string, string?]) => Api.getEventConfigs(sessionKey);
const eventsFetcher = ([, sessionKey]: [string, string]) => Api.getEvents(sessionKey);
const pansPaginatedFetcher = ([, sessionKey, limit, offset]: [string, string, number, number]) =>
    Api.getPansPaginated(sessionKey, limit, offset);
const pansByUserFetcher = ([, userId, limit, offset]: [string, number, number, number]) =>
    Api.getPansByUser(userId, limit, offset);
const availableCountsFetcher = ([, sessionKey]: [string, string]) => Api.getAvailableIngredientCounts(sessionKey);
const invitesFetcher = () => Api.listInvites();
const userProfileFetcher = ([, userId]: [string, number]) => Api.getUserProfile(userId);
const userStatsFetcher = ([, userId]: [string, number]) => Api.getUserStats(userId);

// SWR Hooks
export function useIngredients(sessionKey?: string) {
    const key = getIngredientsKey(sessionKey);
    return useSWR(key, ingredientsFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function usePrepTypes(sessionKey?: string) {
    const key = getPrepTypesKey(sessionKey);
    return useSWR(key, prepTypesFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function useCurrentUser() {
    const key = getCurrentUserKey();
    return useSWR(key, currentUserFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function useSession(sessionKey?: string) {
    const key = getSessionKey(sessionKey);
    return useSWR(key, sessionFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

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

export function usePansPaginated(sessionKey?: string, limit: number = 12, offset: number = 0) {
    const key = getPansPaginatedKey(sessionKey, limit, offset);
    return useSWR(key, pansPaginatedFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function usePansByUser(userId?: number, limit: number = 12, offset: number = 0) {
    const key = getPansByUserKey(userId, limit, offset);
    return useSWR(key, pansByUserFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function useAvailableIngredientCounts(sessionKey?: string) {
    const key = getAvailableCountsKey(sessionKey);
    return useSWR(key, availableCountsFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function useInvites() {
    const key = getInvitesKey();
    return useSWR(key, invitesFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function useUserProfile(userId: number) {
    const key = getUserProfileKey(userId);
    return useSWR(key, userProfileFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

export function useUserStats(userId: number) {
    const key = getUserStatsKey(userId);
    return useSWR(key, userStatsFetcher, {
        onErrorRetry: onErrorRetry,
        revalidateOnFocus: false,
        revalidateOnReconnect: true
    });
}

// Mutation helpers for cache invalidation
export function mutateIngredients(sessionKey?: string) {
    const key = getIngredientsKey(sessionKey);
    if (key) {
        return swrMutate(key);
    }
}

export function mutatePrepTypes(sessionKey?: string) {
    const key = getPrepTypesKey(sessionKey);
    if (key) {
        return swrMutate(key);
    }
}

export function mutateUser() {
    const key = getCurrentUserKey();
    return swrMutate(key);
}

export function mutateSession(sessionKey?: string) {
    const key = getSessionKey(sessionKey);
    if (key) {
        return swrMutate(key);
    }
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

export function mutatePansPaginated(sessionKey?: string) {
    // Invalidate all paginated pans for this session
    if (sessionKey) {
        return swrMutate((key) => Array.isArray(key) && key[0] === "pansPaginated" && key[1] === sessionKey);
    }
}

export function mutatePansByUser(userId?: number) {
    // Invalidate all pages of this user's pans
    if (userId) {
        return swrMutate((key) => Array.isArray(key) && key[0] === "pansByUser" && key[1] === userId);
    }
}

export function mutateUserProfile(userId?: number) {
    if (userId) {
        return swrMutate(getUserProfileKey(userId));
    }
}

export function mutateAvailableCounts(sessionKey?: string) {
    const key = getAvailableCountsKey(sessionKey);
    if (key) {
        return swrMutate(key);
    }
}

export function mutateInvites() {
    const key = getInvitesKey();
    return swrMutate(key);
}

