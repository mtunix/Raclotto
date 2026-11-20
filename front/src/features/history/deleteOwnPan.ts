import { deletePan } from "../../api/generated/endpoints/pans/pans";
import type { PanDto } from "../../api/generated/model";
import {
    mutateAchievements,
    mutatePanFilterOptions,
    mutateSessionFigures,
    mutateUserProfile,
    mutateUserStats,
} from "../../lib/api/swrHooks";

/**
 * Delete the signed-in user's own pan, with its ratings, and refresh what counted it: filter options,
 * dashboard and recaps, the author's statistics and achievements (revocable ones are judged again).
 * The pan lists are left to the caller, which drops the pan (`usePanPages().removePan`), since
 * refetching a page would skip the pan that moves up into it.
 */
export async function deleteOwnPan(pan: PanDto): Promise<void> {
    await deletePan(pan.id);
    void mutatePanFilterOptions();
    void mutateSessionFigures();
    void mutateAchievements();
    void mutateUserStats(pan.user_id);
    void mutateUserProfile(pan.user_id);
}
