import { setCandidatePicture } from "../api/generated/endpoints/images/images";
import { mutateProfilePictureHistory } from "../lib/api/swrHooks";

/** Makes a picture the one the user's next generated picture starts from, then refetches their history. */
export async function chooseCandidatePicture(userId: number, pictureId: number): Promise<void> {
  await setCandidatePicture(pictureId);
  await mutateProfilePictureHistory(userId);
}
