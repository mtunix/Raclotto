import { useAuthStore } from "../AuthSlice";
import { getMe, updateMe } from "../api/generated/endpoints/auth/auth";
import {
  generateProfilePicture,
  getProfilePictureHistory,
  setCandidatePicture,
} from "../api/generated/endpoints/images/images";
import type { GeneratedPictureDto, MeDto } from "../api/generated/model";
import {
  mutateMe,
  mutatePanLists,
  mutateProfilePictureHistory,
  mutateUserProfile,
} from "../lib/api/swrHooks";

/*
 * Every change to the signed-in user's profile picture. Each resolves once everything that shows
 * the picture has it: the user in the auth store, me, their profile and picture history, and the
 * pan lists with their avatar.
 */

/** Show `picture` (a data URL), or none for null; the saved picture is the one generation starts from. */
export async function changeMyPicture(picture: string | null): Promise<MeDto> {
  const me = await updateMe({ profile_picture: picture });
  try {
    // Newest first: the picture just saved.
    const [saved] = await getProfilePictureHistory(me.id);
    if (saved && !saved.is_candidate) {
      await setCandidatePicture(saved.id);
    }
  } catch (error) {
    // The picture is saved either way.
    console.error("Failed to make the saved picture the candidate:", error);
  }
  await refresh(Promise.resolve(me));
  return me;
}

/** A new picture for `levelId` (the user's own level by default), drawn from their candidate. */
export async function generateMyPicture(levelId?: number): Promise<GeneratedPictureDto> {
  const picture = await generateProfilePicture({ level_id: levelId });
  await refresh(getMe());
  return picture;
}

/** Make one of the user's pictures the one their next generated picture starts from. */
export async function chooseCandidatePicture(userId: number, pictureId: number): Promise<void> {
  await setCandidatePicture(pictureId);
  await mutateProfilePictureHistory(userId);
}

/** The change is made either way, so a failed refresh is only logged. */
async function refresh(me: Promise<MeDto>): Promise<void> {
  try {
    const user = await me;
    useAuthStore.getState().setUser(user);
    await Promise.all([
      mutateMe(),
      mutateUserProfile(user.id),
      mutateProfilePictureHistory(user.id),
      mutatePanLists(),
    ]);
  } catch (error) {
    console.error("Failed to refresh the user's picture:", error);
  }
}
