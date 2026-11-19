import { Avatar, Button, Empty, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { getProfilePictureUrl } from "../../lib/utils/profilePictureUrl";
import { PictureHistory } from "./PictureHistory";
import { usePictureHistory } from "./usePictureHistory";
import { captionStyle, pictureColumnStyle } from "./styles";

interface ViewPictureModalProps {
  open: boolean;
  currentPicture: string | null;
  userId?: number;
  onClose: () => void;
}

/** Someone else's picture and picture history, read-only. */
export function ViewPictureModal({ open, currentPicture, userId, onClose }: ViewPictureModalProps) {
  const { t } = useTranslation();
  const { history, loading } = usePictureHistory(userId, open);

  return (
    <Modal
      title={t("profile.viewProfilePicture")}
      open={open}
      onCancel={onClose}
      footer={
        <Button onClick={onClose} style={{ width: "100%" }}>
          {t("auth.close")}
        </Button>
      }
      width={600}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {currentPicture && (
          <div style={{ ...pictureColumnStyle, marginBottom: "16px" }}>
            <div style={captionStyle}>{t("profile.currentPicture")}</div>
            <Avatar size={400} src={getProfilePictureUrl(currentPicture)} style={{ border: "3px solid #d9d9d9" }} />
          </div>
        )}
        <PictureHistory
          history={history}
          loading={loading}
          whenEmpty={<Empty description={t("profile.noHistoryYet")} />}
        />
      </div>
    </Modal>
  );
}
