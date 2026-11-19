import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { cameraErrorKey } from "./cameraError";

export interface Camera {
  /** The video the stream plays in while the camera is active. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  start(): Promise<void>;
  stop(): void;
  /** The current frame as a JPEG data URL, stopping the camera; null while there is no frame yet. */
  capture(): string | null;
}

const stopTracks = (stream: MediaStream | null) => stream?.getTracks().forEach((track) => track.stop());

/** The device camera; its stream ends on `stop`, a capture or unmount. */
export function useCamera(): Camera {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!active || !video || !stream) return;
    video.srcObject = stream;
    // The video can only play once it has data, which may arrive after this effect.
    const tryPlay = () => {
      if (video.readyState >= 2 && video.srcObject) {
        video.play().catch((error: unknown) => console.error("Error playing video stream:", error));
      }
    };
    tryPlay();
    video.addEventListener("canplay", tryPlay);
    video.addEventListener("loadedmetadata", tryPlay);
    return () => {
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("loadedmetadata", tryPlay);
    };
  }, [active]);

  useEffect(() => () => stopTracks(streamRef.current), []);

  const stop = useCallback(() => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      message.error(t("auth.cameraNotSupported"));
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
      setActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      message.error(t(cameraErrorKey(error)));
    }
  }

  function capture(): string | null {
    const video = videoRef.current;
    if (!active || !video || video.videoWidth === 0 || video.videoHeight === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0);
    const picture = canvas.toDataURL("image/jpeg", 0.8);
    stop();
    return picture;
  }

  return { videoRef, active, start, stop, capture };
}
