import { useState } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../AuthSlice";
import { failureMessage } from "../../lib/api/failedRequest";
import { changeMyPicture, generateMyPicture } from "../../shared/myProfilePicture";

/** Changing or regenerating the picture on the signed-in user's own profile; does nothing on anyone else's. */
export function useMyPictureActions(isOwnProfile: boolean, levelId: number | undefined) {
  const { t } = useTranslation();
  const signedIn = useAuthStore((state) => state.user !== null);
  const [changing, setChanging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const allowed = isOwnProfile && signedIn;

  function change(picture: string | null) {
    if (!allowed) return Promise.resolve();
    setChanging(true);
    return changeMyPicture(picture)
      .then(() => {
        message.success(t("profile.pictureUpdated"));
      })
      .catch((error: unknown) => {
        console.error("Failed to update profile picture:", error);
        message.error(failureMessage(error, t, t("profile.pictureUpdateFailed")));
      })
      .finally(() => setChanging(false));
  }

  function regenerate() {
    if (!allowed) return;
    setGenerating(true);
    void generateMyPicture(levelId)
      .then(({ image_base64 }) => {
        if (!image_base64) {
          message.error(t("profile.regenerateFailed"));
          return;
        }
        message.success(t("profile.pictureUpdated"));
      })
      .catch((error: unknown) => {
        console.error("Failed to regenerate profile picture:", error);
        message.error(failureMessage(error, t, t("profile.regenerateFailed")));
      })
      .finally(() => setGenerating(false));
  }

  return { changing, generating, change, regenerate };
}
