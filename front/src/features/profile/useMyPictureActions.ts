import { useState } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../AuthSlice";
import { changeMyPicture, generateMyPicture } from "../../shared/myProfilePicture";

const errorText = (error: unknown) => (error instanceof Error ? error.message : "");

/** Changing or regenerating the picture on the signed-in user's own profile; does nothing on anyone else's. */
export function useMyPictureActions(isOwnProfile: boolean, levelId: number | undefined) {
  const { t } = useTranslation();
  const signedIn = useAuthStore((state) => state.user !== null);
  const [changing, setChanging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const allowed = isOwnProfile && signedIn;

  async function change(picture: string | null) {
    if (!allowed) return;
    setChanging(true);
    try {
      await changeMyPicture(picture);
      message.success(t("profile.pictureUpdated"));
    } catch (error) {
      console.error("Failed to update profile picture:", error);
      message.error(errorText(error) || t("profile.pictureUpdateFailed"));
    } finally {
      setChanging(false);
    }
  }

  async function regenerate() {
    if (!allowed) return;
    setGenerating(true);
    try {
      const { image_base64 } = await generateMyPicture(levelId);
      if (!image_base64) {
        throw new Error(t("profile.regenerateFailed"));
      }
      message.success(t("profile.pictureUpdated"));
    } catch (error) {
      console.error("Failed to regenerate profile picture:", error);
      message.error(errorText(error) || t("profile.regenerateFailed"));
    } finally {
      setGenerating(false);
    }
  }

  return { changing, generating, change, regenerate };
}
