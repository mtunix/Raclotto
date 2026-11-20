import { useRef, type ChangeEvent } from "react";
import { Button, Space, message } from "antd";
import { CameraOutlined, UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { Camera } from "./useCamera";
import { pictureFileProblem, readAsDataUrl } from "./pictureFile";
import "./ProfilePictureManager.css";


interface PictureSourceProps {
  camera: Camera;
  /** A data URL; the camera is stopped by then. */
  onPicked: (picture: string) => void;
  disabled?: boolean;
}

/** Pick a picture from a file or take one with the camera. */
export function PictureSource({ camera, onPicked, disabled }: PictureSourceProps) {
  // Destructured: once `camera.videoRef` is passed as a ref, the compiler counts every read of `camera` in render as a ref read.
  const { active, videoRef, start, stop, capture } = camera;
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pick(picture: string) {
    stop();
    onPicked(picture);
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const problem = pictureFileProblem(file);
    if (problem) {
      message.error(t(problem));
      return;
    }
    readAsDataUrl(file).then(pick, (error: unknown) => console.error("Failed to read the picture:", error));
  }

  function takePicture() {
    const picture = capture();
    if (picture) pick(picture);
  }

  return (
    <div className="stack-8 full-width">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} hidden />
      <Button icon={<UploadOutlined />} disabled={disabled} onClick={() => fileInputRef.current?.click()} block>
        {t("auth.selectImage")}
      </Button>
      {active ? (
        <div className="stack-8 full-width">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="picture-camera"
          />
          <Space orientation="vertical" className="full-width">
            <Button onClick={takePicture} type="primary" size="large" disabled={disabled} block>
              {t("auth.capture")}
            </Button>
            <Button onClick={stop} size="large" disabled={disabled} block>
              {t("auth.cancel")}
            </Button>
          </Space>
        </div>
      ) : (
        <Button icon={<CameraOutlined />} onClick={start} disabled={disabled} block>
          {t("auth.takePhoto")}
        </Button>
      )}
    </div>
  );
}
