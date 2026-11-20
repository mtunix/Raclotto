import { Avatar, Button, Empty, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { getProfilePictureUrl } from "../../lib/utils/profilePictureUrl";
import { PictureHistory } from "./PictureHistory";
import { usePictureHistory } from "./usePictureHistory";
import "./ProfilePictureManager.css";

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
        <Button onClick={onClose} className="full-width">
          {t("auth.close")}
        </Button>
      }
      width={600}
    >
      <div className="stack-16">
        {currentPicture && (
          <div className="picture-column mb-16">
            <div className="picture-caption">{t("profile.currentPicture")}</div>
            <Avatar size={400} src={getProfilePictureUrl(currentPicture)} className="picture-avatar" />
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
