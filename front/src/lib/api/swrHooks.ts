import useSWR, { mutate as swrMutate } from "swr";
import { Api } from "./index";
import { Ingredient } from "../../model/ingredient";
import { PrepType } from "../../model/prepType";
import { Pan } from "../../model/pan";
import { Event } from "../../model/event";
import { EventConfig } from "../../model/eventConfig";
import { RaclottoSession } from "../../model/raclottoSession";
import { StatsResponse, LeaderboardEntry } from "./types";
import { onErrorRetry } from "./api";

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
const ingredientsFetcher = async (key: [string, string]): Promise<Ingredient[]> => {
    const [, sessionKey] = key;
    const data = await Api.get("ingredients", sessionKey);
    const ingredientsData = Array.isArray(data) ? data as Ingredient[] : [];
    return ingredientsData;
};

const prepTypesFetcher = async (key: [string, string]): Promise<PrepType[]> => {
    const [, sessionKey] = key;
    const data = await Api.get("preparation_type", sessionKey);
    const prepTypesData = Array.isArray(data) ? data as PrepType[] : [];
    return prepTypesData;
};

const currentUserFetcher = async (): Promise<any> => {
    return await Api.getCurrentUser();
};

const sessionFetcher = async (key: [string, string]): Promise<RaclottoSession> => {
    const [, sessionKey] = key;
    return await Api.getSessionByKey(sessionKey);
};

const statsFetcher = async (key: [string, string | null, boolean]): Promise<StatsResponse> => {
    const [, sessionKey, isGlobal] = key;
    return await Api.getStats(isGlobal ? undefined : (sessionKey || undefined));
};

const leaderboardFetcher = async (): Promise<LeaderboardEntry[]> => {
    return await Api.getLeaderboard();
};

const achievementsFetcher = async (): Promise<any[]> => {
    const data = await Api.get("achievements");
    if (Array.isArray(data)) {
        return data.map((item: any) => {
            const attributes = item.attributes || item;
            return {
                id: item.id ? (typeof item.id === 'string' ? parseInt(item.id, 10) : Number(item.id)) : attributes.id,
                title: attributes.title || item.title || '',
                name: attributes.title || item.title || attributes.name || item.name || '', // Support both for compatibility
                description: attributes.description || item.description || '',
                value: attributes.value !== undefined ? attributes.value : (item.value !== undefined ? item.value : 0),
                points: attributes.value !== undefined ? attributes.value : (item.value !== undefined ? item.value : 0), // Support both for compatibility
                hidden: attributes.hidden !== undefined ? attributes.hidden : (item.hidden !== undefined ? item.hidden : false),
                unlocked: attributes.unlocked !== undefined ? attributes.unlocked : (item.unlocked !== undefined ? item.unlocked : undefined),
                progress: attributes.progress !== undefined ? attributes.progress : (item.progress !== undefined ? item.progress : undefined),
                icon: attributes.icon || item.icon,
                category: attributes.category || item.category
            };
        });
    }
    return [];
};

const eventConfigsFetcher = async (key: [string, string?]): Promise<EventConfig[]> => {
    const [, sessionKey] = key;
    return await Api.getEventConfigs(sessionKey);
};

const eventsFetcher = async (key: [string, string]): Promise<Event[]> => {
    const [, sessionKey] = key;
    return await Api.getEvents(sessionKey);
};

const pansPaginatedFetcher = async (key: [string, string, number, number]): Promise<{ data: Pan[]; hasMore: boolean; total: number }> => {
    const [, sessionKey, limit, offset] = key;
    return await Api.getPansPaginated(sessionKey, limit, offset);
};

const pansByUserFetcher = async (key: [string, number, number, number]): Promise<{ data: Pan[]; hasMore: boolean; total: number }> => {
    const [, userId, limit, offset] = key;
    return await Api.getPansByUser(userId, limit, offset);
};

const availableCountsFetcher = async (key: [string, string]): Promise<{fill_count: number; sauce_count: number}> => {
    const [, sessionKey] = key;
    return await Api.getAvailableIngredientCounts(sessionKey);
};

const invitesFetcher = async (): Promise<any[]> => {
    return await Api.listInvites();
};

const userProfileFetcher = async (key: [string, number]): Promise<any> => {
    const [, userId] = key;
    return await Api.getUserProfile(userId);
};

const userStatsFetcher = async (key: [string, number]): Promise<any> => {
    const [, userId] = key;
    return await Api.getUserStats(userId);
};

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

