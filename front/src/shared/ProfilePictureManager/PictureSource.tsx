import { useRef, type CSSProperties, type ChangeEvent } from "react";
import { Button, Space, message } from "antd";
import { CameraOutlined, UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { Camera } from "./useCamera";
import { pictureFileProblem, readAsDataUrl } from "./pictureFile";

const columnStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "8px", width: "100%" };

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
    <div style={columnStyle}>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      <Button icon={<UploadOutlined />} disabled={disabled} onClick={() => fileInputRef.current?.click()} block>
        {t("auth.selectImage") || "Select Image"}
      </Button>
      {active ? (
        <div style={columnStyle}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "auto", borderRadius: "8px", backgroundColor: "#000" }}
          />
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Button onClick={takePicture} type="primary" size="large" disabled={disabled} block>
              {t("auth.capture") || "Capture"}
            </Button>
            <Button onClick={stop} size="large" disabled={disabled} block>
              {t("auth.cancel") || "Cancel"}
            </Button>
          </Space>
        </div>
      ) : (
        <Button icon={<CameraOutlined />} onClick={start} disabled={disabled} block>
          {t("auth.takePhoto") || "Take Photo"}
        </Button>
      )}
    </div>
  );
}
