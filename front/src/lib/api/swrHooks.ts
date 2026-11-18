import { mutate as swrMutate } from "swr";
import { getListAchievementsKey } from "../../api/generated/endpoints/achievements/achievements";
import { getGetMeKey } from "../../api/generated/endpoints/auth/auth";
import { getListEventConfigsKey, getListEventsKey } from "../../api/generated/endpoints/events/events";
import { getGetProfilePictureHistoryKey } from "../../api/generated/endpoints/images/images";
import {
    getGetAvailableCountsKey,
    getListIngredientsKey,
} from "../../api/generated/endpoints/ingredients/ingredients";
import { getListPansKey } from "../../api/generated/endpoints/pans/pans";
import { getListPreparationTypesKey } from "../../api/generated/endpoints/preparation-type/preparation-type";
import { getGetSessionByKeyKey } from "../../api/generated/endpoints/sessions/sessions";
import { getGetUserProfileKey } from "../../api/generated/endpoints/users/users";

/** What SWR's retry sees of a failed request; only the status matters. */
interface FailedRequest {
    status?: number;
}

export const onErrorRetry = (
    error: FailedRequest,
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

export function mutateAchievements() {
    return swrMutate(getListAchievementsKey());
}

/** The event configs as the settings of this session list them. */
export function mutateEventConfigs(sessionKey: string) {
    return swrMutate(getListEventConfigsKey({ session_key: sessionKey }));
}

export function mutateEvents(sessionKey: string) {
    return swrMutate(getListEventsKey({ session_key: sessionKey }));
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

export function mutateProfilePictureHistory(userId: number) {
    return swrMutate(getGetProfilePictureHistoryKey(userId));
}

export function mutateAvailableCounts(sessionKey: string) {
    return swrMutate(getGetAvailableCountsKey({ session_key: sessionKey }));
}
