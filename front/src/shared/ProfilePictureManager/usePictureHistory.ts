import { useState } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { useGetProfilePictureHistory } from "../../api/generated/endpoints/images/images";
import { onErrorRetry } from "../../lib/api/swrHooks";
import { chooseCandidatePicture } from "../myProfilePicture";

/** A user's pictures, loaded while `active`, and choosing the one their generated pictures start from. */
export function usePictureHistory(userId: number | undefined, active: boolean) {
  const { t } = useTranslation();
  const { data: history = [], isLoading: loading } = useGetProfilePictureHistory(userId ?? 0, {
    swr: { enabled: active && !!userId, onErrorRetry, revalidateOnFocus: false },
  });
  // The picture being made the candidate, while the request runs.
  const [choosing, setChoosing] = useState<number | null>(null);

  async function choose(pictureId: number) {
    if (!userId) return;
    setChoosing(pictureId);
    try {
      await chooseCandidatePicture(userId, pictureId);
      message.success(t("image.candidatePictureSet") || "Set as generation candidate");
    } catch (error) {
      console.error("Failed to set candidate picture:", error);
      message.error(t("image.candidatePictureSetFailed") || "Failed to set as generation candidate");
    } finally {
      setChoosing(null);
    }
  }

  return { history, loading, choosing, choose };
}
