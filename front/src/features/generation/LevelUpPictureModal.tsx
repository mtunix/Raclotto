import { useEffect, useState } from "react";
import {
  Modal,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Button,
  Spin,
  message,
} from "antd";
import { useTranslation } from "react-i18next";
import type { GeneratedPictureDto } from "../../api/generated/model";
import { generateMyPicture } from "../../shared/myProfilePicture";
import styles from "./GenerateView/GenerateView.module.css";
import "./LevelUpPictureModal.css";

const { Title, Text } = Typography;

interface LevelUpPictureModalProps {
  /** Opening the modal starts generating the picture for `levelId`. */
  open: boolean;
  levelId?: number;
  onClose: () => void;
}

/**
 * Level-up reward: generates a new profile picture for the reached level,
 * shows a spinner while it is generated and the picture once it is ready.
 */
export function LevelUpPictureModal({
  open,
  levelId,
  onClose,
}: LevelUpPictureModalProps) {
  const { t } = useTranslation();
  const [newProfilePicture, setNewProfilePicture] =
    useState<GeneratedPictureDto | null>(null);
  const generating = open && levelId ? levelId : null;
  const [generatingFor, setGeneratingFor] = useState(generating);
  if (generatingFor !== generating) {
    setGeneratingFor(generating);
    setNewProfilePicture(null);
  }

  useEffect(() => {
    if (!open || !levelId) return;
    let cancelled = false;
    generateMyPicture(levelId)
      .then((picture) => {
        if (!cancelled) setNewProfilePicture(picture);
      })
      .catch((error) => {
        console.error("Error generating profile picture:", error);
        message.error(
          t("image.profilePictureError"),
        );
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- one generation per open level; a new onClose or t must not start another
  }, [open, levelId]);

  const handleClose = () => {
    setNewProfilePicture(null);
    onClose();
  };

  return (
    <>
      {/* Profile Picture Generation Modal */}
      <Modal
        open={open && !newProfilePicture}
        footer={null}
        width="90%"
        className={`${styles.modalContainer} profile-picture-spinner-modal`}
        centered
        closable={false}
        classNames={{ body: "level-up-generating" }}
      >
        <div className="text-center full-width">
          <div className="level-up-generating-sparkles">✨🎨✨</div>
          <Spin
            description={
              t("image.generatingProfilePicture")
            }
            size="large"
          />
          <div className="level-up-generating-message">
            {t("image.generatingMessage")}
          </div>
          <div className="level-up-generating-icons">
            <span>🌟</span>
            <span>🎭</span>
            <span>🖼️</span>
          </div>
        </div>
      </Modal>

      {/* Profile Picture Display Modal */}
      {open && newProfilePicture && (
        <Modal
          open={open}
          onCancel={handleClose}
          footer={null}
          width="90%"
          className={`${styles.modalContainer} profile-picture-modal`}
          centered
          closable
          classNames={{ body: "level-up-picture" }}
        >
          <div className="text-center">
            <Card className={styles.gradientCard} classNames={{ body: styles.cardBodyLarge }}>
              <Title level={2} className={styles.whiteTitle}>
                {t("image.yourNewProfilePicture")}
              </Title>
              <Text className="level-up-picture-updated">
                {t("image.profilePictureUpdated")}
              </Text>
            </Card>

            <Card className="level-up-picture-frame">
              <img
                src={`data:${newProfilePicture.mime_type};base64,${newProfilePicture.image_base64}`}
                alt={t("image.newAvatarAlt")}
                className="level-up-picture-image"
              />
            </Card>

            <Divider className={styles.customDivider} />

            <Row>
              <Col span={24}>
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={handleClose}
                  className={styles.closeButton}
                >
                  {t("common.close")}
                </Button>
              </Col>
            </Row>
          </div>
        </Modal>
      )}
    </>
  );
}
