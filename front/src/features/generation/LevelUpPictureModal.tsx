import React, { useEffect, useState } from "react";
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
import { generateProfilePicture } from "../../api/generated/endpoints/images/images";
import type { GeneratedPictureDto } from "../../api/generated/model";
import { mutateUserProfile } from "../../lib/api/swrHooks";
import { useAuthStore } from "../../AuthSlice";
import styles from "./GenerateView/GenerateView.module.css";

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

  useEffect(() => {
    if (!open || !levelId) return;
    let cancelled = false;
    setNewProfilePicture(null);
    generateProfilePicture({ level_id: levelId })
      .then((picture) => {
        if (cancelled) return;
        setNewProfilePicture(picture);
        // Refetch profile data to update the display with the new image
        mutateUserProfile(useAuthStore.getState().user?.id);
      })
      .catch((error) => {
        console.error("Error generating profile picture:", error);
        message.error(
          t("image.profilePictureError") || "Error generating profile picture",
        );
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one generation per open level; a new onClose or t must not start another
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
        styles={{
          body: {
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          },
        }}
      >
        <div style={{ textAlign: "center", width: "100%" }}>
          <div style={{ marginBottom: "24px", fontSize: "48px" }}>✨🎨✨</div>
          <Spin
            tip={
              t("image.generatingProfilePicture") ||
              "Generating your new profile picture..."
            }
            size="large"
          />
          <div
            style={{
              marginTop: "32px",
              fontSize: "14px",
              color: "#fff",
              opacity: 0.9,
              fontStyle: "italic",
            }}
          >
            {t("image.generatingMessage") ||
              "Creating an artistic masterpiece just for you..."}
          </div>
          <div
            style={{
              marginTop: "24px",
              display: "flex",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "20px",
                animation: "pulse 1s infinite",
              }}
            >
              🌟
            </span>
            <span
              style={{
                fontSize: "20px",
                animation: "pulse 1s infinite 0.2s",
              }}
            >
              🎭
            </span>
            <span
              style={{
                fontSize: "20px",
                animation: "pulse 1s infinite 0.4s",
              }}
            >
              🖼️
            </span>
          </div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.2);
            }
          }
        `}</style>
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
          styles={{
            body: {
              padding: "32px",
            },
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Card
              className={styles.gradientCard}
              bodyStyle={{ padding: "28px" }}
            >
              <Title level={2} className={styles.whiteTitle}>
                {t("image.yourNewProfilePicture") || "Your New Profile Picture"}
              </Title>
              <Text style={{ color: "#fff", fontSize: "16px" }}>
                {t("image.profilePictureUpdated") ||
                  "Your profile picture has been updated for your new level!"}
              </Text>
            </Card>

            <Card
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "400px",
              }}
            >
              <img
                src={`data:${newProfilePicture.mime_type};base64,${newProfilePicture.image_base64}`}
                alt={t("image.newAvatarAlt") || "Your new avatar"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  borderRadius: "8px",
                }}
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
                  {t("common.close") || "Close"}
                </Button>
              </Col>
            </Row>
          </div>
        </Modal>
      )}
    </>
  );
}
