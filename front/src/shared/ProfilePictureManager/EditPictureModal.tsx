import { useState } from "react";
import { Avatar, Button, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { initialOf } from "./pictureFile";
import { PictureHistory } from "./PictureHistory";
import { PictureSource } from "./PictureSource";
import { useCamera } from "./useCamera";
import { usePictureHistory } from "./usePictureHistory";
import "./ProfilePictureManager.css";

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

  const [draftOf, setDraftOf] = useState({ open, currentPicture });
  if (draftOf.open !== open || draftOf.currentPicture !== currentPicture) {
    setDraftOf({ open, currentPicture });
    if (open) setDraft(currentPicture);
  }

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

  const caption = <div className="picture-caption">{t("profile.currentPicture")}</div>;

  return (
    <Modal
      title={t("profile.changeProfilePicture")}
      open={open}
      onCancel={cancel}
      footer={
        <div className="picture-footer">
          <Button onClick={cancel} className="flex-1">
            {t("auth.cancel")}
          </Button>
          <Button type="primary" onClick={save} disabled={draft === currentPicture} className="flex-1">
            {t("common.save")}
          </Button>
        </div>
      }
      width={600}
    >
      <div className="stack-16">
        {draft ? (
          <div className="picture-column">
            {caption}
            <Avatar size={400} src={draft} className="picture-avatar picture-avatar-draft" />
            <Button onClick={() => setDraft(null)} block>
              {t("auth.removePhoto")}
            </Button>
          </div>
        ) : (
          <div className="picture-column picture-column-wide">
            {caption}
            <Avatar size={400} className="picture-avatar picture-avatar-empty">
              <span className="picture-avatar-initial">{initialOf(userName)}</span>
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
        className="mt-12"
      />
    </Modal>
  );
}
