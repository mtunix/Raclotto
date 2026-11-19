import React, { useEffect, useState } from "react";
import { Avatar, Button, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { initialOf } from "./pictureFile";
import { PictureHistory } from "./PictureHistory";
import { PictureSource } from "./PictureSource";
import { useCamera } from "./useCamera";
import { usePictureHistory } from "./usePictureHistory";
import { captionStyle, pictureColumnStyle } from "./styles";

interface EditPictureModalProps {
  open: boolean;
  currentPicture: string | null;
  userName?: string;
  userId?: number;
  /** Called with the edited picture when it differs; the dialog closes once it resolves. */
  onSave: (picture: string | null) => void | Promise<void>;
  onClose: () => void;
}

/** The signed-in user's dialog for their own picture: replace or remove it, choose the generation candidate. */
export function EditPictureModal({ open, currentPicture, userName, userId, onSave, onClose }: EditPictureModalProps) {
  const { t } = useTranslation();
  const camera = useCamera();
  const [draft, setDraft] = useState(currentPicture);
  const { history, loading, choosing, choose } = usePictureHistory(userId, open);

  useEffect(() => {
    if (open) setDraft(currentPicture);
  }, [open, currentPicture]);

  function close() {
    camera.stop();
    onClose();
  }

  function cancel() {
    setDraft(currentPicture);
    close();
  }

  async function save() {
    if (draft !== currentPicture) {
      await onSave(draft);
    }
    close();
  }

  const caption = <div style={captionStyle}>{t("profile.currentPicture") || "Current Profile Picture"}</div>;

  return (
    <Modal
      title={t("profile.changeProfilePicture") || "Change Profile Picture"}
      open={open}
      onCancel={cancel}
      footer={
        <div style={{ display: "flex", gap: "8px" }}>
          <Button onClick={cancel} style={{ flex: 1 }}>
            {t("auth.cancel") || "Cancel"}
          </Button>
          <Button type="primary" onClick={save} disabled={draft === currentPicture} style={{ flex: 1 }}>
            {t("common.save") || "Save"}
          </Button>
        </div>
      }
      width={600}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {draft ? (
          <div style={pictureColumnStyle}>
            {caption}
            <Avatar size={400} src={draft} style={{ border: "3px solid #1890ff" }} />
            <Button onClick={() => setDraft(null)} block>
              {t("auth.removePhoto") || "Remove Photo"}
            </Button>
          </div>
        ) : (
          <div style={{ ...pictureColumnStyle, gap: "16px" }}>
            {caption}
            <Avatar size={400} style={{ border: "3px solid #d9d9d9", backgroundColor: "#f0f0f0" }}>
              <span style={{ fontSize: "120px" }}>{initialOf(userName)}</span>
            </Avatar>
            <PictureSource camera={camera} onPicked={setDraft} />
          </div>
        )}
      </div>
      <PictureHistory
        history={history}
        loading={loading}
        onChoose={choose}
        choosing={choosing}
        style={{ marginTop: "12px" }}
      />
    </Modal>
  );
}
