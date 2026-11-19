import { useAuthStore } from "../../AuthSlice";
import { getPan } from "../../api/generated/endpoints/pans/pans";
import { createRating } from "../../api/generated/endpoints/ratings/ratings";
import type { PanDto } from "../../api/generated/model";
import { mutateAchievements, mutatePanLists, mutateUserProfile } from "../../lib/api/swrHooks";

/**
 * Rate a pan as the signed-in user, or change the stars they gave it, and refresh what a rating
 * changes: the pan's average in every pan list, achievements, and the rater's and author's
 * profiles. Resolves to the pan with its new average.
 */
export async function ratePan(panId: number, stars: number): Promise<PanDto> {
  await createRating({ pan_id: panId, rating: stars });
  const pan = await getPan(panId);
  const rater = useAuthStore.getState().user;
  mutatePanLists();
  mutateAchievements();
  mutateUserProfile(pan.user_id);
  if (rater && rater.id !== pan.user_id) {
    mutateUserProfile(rater.id);
  }
  return pan;
}
