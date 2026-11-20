import { Avatar, Button } from "antd";
import { useTranslation } from "react-i18next";
import { getProfilePictureUrl } from "../../lib/utils/profilePictureUrl";
import { PictureSource } from "./PictureSource";
import { useCamera } from "./useCamera";
import "./ProfilePictureManager.css";

interface DirectPictureEditorProps {
  picture: string | null;
  /** Called on every pick or removal; the parent holds the picture. */
  onChange: (picture: string | null) => void;
  disabled?: boolean;
  /** Space it from the avatar shown above it. */
  belowAvatar: boolean;
}

/** Pick or remove a picture inline, without a dialog: registration's picture field. */
export function DirectPictureEditor({ picture, onChange, disabled, belowAvatar }: DirectPictureEditorProps) {
  const { t } = useTranslation();
  const camera = useCamera();

  return (
    <div className={belowAvatar ? "stack-16 mt-16" : "stack-16"}>
      {picture ? (
        <div className="picture-column">
          <Avatar size={120} src={getProfilePictureUrl(picture)} />
          <Button onClick={() => onChange(null)} disabled={disabled} block>
            {t("auth.removePhoto")}
          </Button>
        </div>
      ) : (
        <PictureSource camera={camera} onPicked={onChange} disabled={disabled} />
      )}
    </div>
  );
}
