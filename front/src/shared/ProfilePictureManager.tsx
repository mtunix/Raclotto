import { useState } from "react";
import { Avatar } from "antd";
import { useTranslation } from "react-i18next";
import { getProfilePictureUrl } from "../lib/utils/profilePictureUrl";
import { DirectPictureEditor } from "./ProfilePictureManager/DirectPictureEditor";
import { EditPictureModal } from "./ProfilePictureManager/EditPictureModal";
import { initialOf } from "./ProfilePictureManager/pictureFile";
import { ViewPictureModal } from "./ProfilePictureManager/ViewPictureModal";
import "./ProfilePictureManager/ProfilePictureManager.css";

interface ProfilePictureManagerProps {
  currentPicture?: string | null;
  /** Saving waits for it; in direct mode it is called on every change instead. */
  onPictureChange: (picture: string | null) => void | Promise<void>;
  disabled?: boolean;
  size?: number;
  showLabel?: boolean;
  /** Edit inline instead of in a dialog, as registration does; the parent holds the picture. */
  directMode?: boolean;
  /** Leave out the avatar, so a direct-mode editor stands alone. */
  hideAvatar?: boolean;
  /** Whose initial the avatar shows without a picture. */
  userName?: string;
  /** Anyone else's picture opens read-only. */
  isOwnProfile?: boolean;
  /** Whose picture history the dialog shows. */
  userId?: number;
}

/** A user's avatar, opening a dialog to change their own picture or look at someone else's. */
export function ProfilePictureManager({
  currentPicture,
  onPictureChange,
  disabled = false,
  size = 120,
  showLabel = true,
  directMode = false,
  hideAvatar = false,
  userName,
  isOwnProfile = true,
  userId,
}: ProfilePictureManagerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const picture = currentPicture || null;
  const opensDialog = !disabled && !directMode;
  const close = () => setOpen(false);

  return (
    <>
      {!hideAvatar && (
        <div
          role={opensDialog ? "button" : undefined}
          tabIndex={opensDialog ? 0 : undefined}
          onClick={opensDialog ? () => setOpen(true) : undefined}
          onKeyDown={opensDialog ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          } : undefined}
          className={opensDialog ? "picture-trigger picture-trigger-opens" : "picture-trigger"}
          style={{ minWidth: size, minHeight: size }}
        >
          <Avatar
            size={size}
            src={getProfilePictureUrl(picture)}
            className={disabled ? "picture-avatar picture-avatar-inline picture-avatar-disabled" : "picture-avatar picture-avatar-inline"}
          >
            {!picture && (
              <span
                className="picture-avatar-fill"
                style={{ fontSize: size * 0.4 }}
              >
                {initialOf(userName)}
              </span>
            )}
          </Avatar>
          {showLabel && !disabled && (
            <div className="picture-label">
              {directMode
                ? t("auth.profilePicture")
                : t("profile.clickToChange")}
            </div>
          )}
        </div>
      )}

      {directMode ? (
        <DirectPictureEditor
          picture={picture}
          onChange={onPictureChange}
          disabled={disabled}
          belowAvatar={!hideAvatar}
        />
      ) : isOwnProfile ? (
        <EditPictureModal
          open={open}
          currentPicture={picture}
          userName={userName}
          userId={userId}
          onSave={onPictureChange}
          onClose={close}
        />
      ) : (
        <ViewPictureModal open={open} currentPicture={picture} userId={userId} onClose={close} />
      )}
    </>
  );
}
