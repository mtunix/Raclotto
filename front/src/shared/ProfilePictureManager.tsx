import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Upload,
  Avatar,
  Space,
  Modal,
  message,
  Collapse,
  Empty,
  Spin,
} from "antd";
import { CameraOutlined, UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { getRaw, postRaw } from "../lib/api/api";
import { getProfilePictureUrl } from "../lib/utils/profilePictureUrl";

interface ProfilePictureEntry {
  id: number;
  profile_picture: string;
  created_at: string;
  level_id: number | null;
  level_name: string | null;
  is_candidate?: boolean;
}

interface ProfilePictureHistoryResponse {
  data: {
    attributes: {
      history: ProfilePictureEntry[];
      total_count: number;
      user_id: number;
      user_name: string;
    };
  };
}

interface ProfilePictureManagerProps {
  currentPicture?: string | null;
  onPictureChange: (picture: string | null) => void;
  disabled?: boolean;
  size?: number;
  showLabel?: boolean;
  directMode?: boolean; // New prop for RegisterView
  hideAvatar?: boolean; // New prop to hide avatar in direct mode
  userName?: string; // New prop for user's name to show correct letter
  isOwnProfile?: boolean; // New prop to restrict editing to own profile
  userId?: number; // User ID for fetching history
}

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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempPicture, setTempPicture] = useState<string | null>(
    currentPicture || null,
  );
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [history, setHistory] = useState<ProfilePictureEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [settingCandidate, setSettingCandidate] = useState(false);
  const [candidatePictureId, setCandidatePictureId] = useState<number | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset temp picture when modal opens or when in direct mode
  useEffect(() => {
    if (isModalVisible || directMode) {
      setTempPicture(currentPicture || null);
      setHasStartedEditing(false);
    }
  }, [isModalVisible, currentPicture, directMode]);

  // Fetch profile picture history when modal opens
  useEffect(() => {
    if (isModalVisible && userId && !directMode) {
      const fetchHistory = async () => {
        try {
          setLoadingHistory(true);
          const response = (await getRaw(
            `/api/images/profile-picture-history/${userId}`,
          )) as ProfilePictureHistoryResponse;
          const historyData = (response.data.attributes.history || []).map(
            (entry) => ({
              ...entry,
              is_candidate: entry.is_candidate || false,
            }),
          );
          setHistory(historyData);

          // Set the candidate picture ID for UI purposes
          const candidatePicture = historyData.find((pic) => pic.is_candidate);
          if (candidatePicture) {
            setCandidatePictureId(candidatePicture.id);
          }
        } catch (error) {
          console.error("Failed to fetch profile picture history:", error);
          setHistory([]);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [isModalVisible, userId, directMode]);

  // Handle video element when camera becomes active
  React.useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      const stream = streamRef.current;

      video.srcObject = stream;

      const tryPlay = () => {
        if (video.readyState >= 2 && video.srcObject) {
          video.play().catch((err) => {
            console.error("Error playing video stream:", err);
          });
        }
      };

      tryPlay();

      const handleCanPlay = () => tryPlay();
      const handleLoadedMetadata = () => tryPlay();

      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [isCameraActive]);

  // Cleanup camera stream on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        message.error(t("auth.invalidImageType"));
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        message.error(t("auth.imageTooLarge"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setTempPicture(result);
        setHasStartedEditing(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MEDIA_DEVICES_NOT_AVAILABLE");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      setIsCameraActive(false);
      let errorMessage = t("auth.cameraError");

      const errorName = err?.name || "";
      const errorMsg = err?.message || "";

      if (errorMsg === "MEDIA_DEVICES_NOT_AVAILABLE") {
        errorMessage = t("auth.cameraNotSupported");
      } else if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError"
      ) {
        errorMessage = t("auth.cameraPermissionDenied");
      } else if (
        errorName === "NotFoundError" ||
        errorName === "DevicesNotFoundError"
      ) {
        errorMessage = t("auth.cameraNotFound");
      } else if (
        errorName === "NotReadableError" ||
        errorName === "TrackStartError"
      ) {
        errorMessage = t("auth.cameraInUse");
      } else if (
        errorName === "NotSupportedError" ||
        errorName === "ConstraintNotSatisfiedError"
      ) {
        errorMessage = t("auth.cameraNotSupported");
      } else if (errorName === "TypeError") {
        if (
          errorMsg.includes("getUserMedia") ||
          errorMsg.includes("mediaDevices") ||
          errorMsg.includes("Cannot read")
        ) {
          errorMessage = t("auth.cameraNotSupported");
        } else {
          errorMessage = t("auth.cameraError");
        }
      } else {
        errorMessage = t("auth.cameraError");
      }
      message.error(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && isCameraActive) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (
        ctx &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.videoHeight > 0
      ) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setTempPicture(dataUrl);
        setHasStartedEditing(true);
        stopCamera();
      }
    }
  };

  const removePhoto = () => {
    // Set to null to show placeholder, not current picture
    setTempPicture(null);
    setHasStartedEditing(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsCameraActive(false);
    stopCamera();
  };

  const handleSave = async () => {
    if (tempPicture !== currentPicture) {
      onPictureChange(tempPicture);

      // After the picture is saved, refetch history to get the newly saved picture
      // and automatically set it as the candidate
      if (userId && !directMode) {
        try {
          // Wait a bit for the backend to process the picture
          await new Promise((resolve) => setTimeout(resolve, 500));

          const historyResponse = (await getRaw(
            `/api/images/profile-picture-history/${userId}`,
          )) as ProfilePictureHistoryResponse;
          const updatedHistory = (
            historyResponse.data.attributes.history || []
          ).map((entry) => ({
            ...entry,
            is_candidate: entry.is_candidate || false,
          }));
          setHistory(updatedHistory);

          // Find the most recently added picture and set it as candidate
          if (updatedHistory.length > 0) {
            const newestPicture = updatedHistory[0]; // Assuming most recent is first
            if (!newestPicture.is_candidate) {
              await postRaw(
                `/api/images/set-candidate-picture/${newestPicture.id}`,
                {},
              );

              // Refetch history again to show the updated candidate status
              const updatedHistoryResponse = (await getRaw(
                `/api/images/profile-picture-history/${userId}`,
              )) as ProfilePictureHistoryResponse;
              const finalHistory = (
                updatedHistoryResponse.data.attributes.history || []
              ).map((entry) => ({
                ...entry,
                is_candidate: entry.is_candidate || false,
              }));
              setHistory(finalHistory);
            }
          }
        } catch (error) {
          console.error(
            "Failed to set newly saved picture as candidate:",
            error,
          );
          // Continue anyway, the picture was still saved successfully
        }
      }
    }
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setTempPicture(currentPicture || null);
    setIsCameraActive(false);
  };

  const handleSetCandidate = async (pictureId: number) => {
    if (!isOwnProfile) return;

    setSettingCandidate(true);
    try {
      await postRaw(`/api/images/set-candidate-picture/${pictureId}`, {});

      // Refetch history from server to ensure is_candidate flag is correctly set
      const historyResponse = (await getRaw(
        `/api/images/profile-picture-history/${userId}`,
      )) as ProfilePictureHistoryResponse;
      const updatedHistory = (
        historyResponse.data.attributes.history || []
      ).map((entry) => ({
        ...entry,
        is_candidate: entry.is_candidate || false,
      }));
      setHistory(updatedHistory);
      setCandidatePictureId(pictureId);
      message.success(
        t("image.candidatePictureSet") || "Set as generation candidate",
      );
    } catch (error) {
      console.error("Failed to set candidate picture:", error);
      message.error(
        t("image.candidatePictureSetFailed") ||
          "Failed to set as generation candidate",
      );
    } finally {
      setSettingCandidate(false);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      setIsModalVisible(true);
    }
  };

  return (
    <>
      {!hideAvatar && (
        <div
          onClick={handleClick}
          style={{
            cursor: disabled ? "default" : directMode ? "default" : "pointer",
            display: "inline-block",
            minWidth: size,
            minHeight: size,
            textAlign: "center",
          }}
        >
          <Avatar
            size={size}
            src={getProfilePictureUrl(currentPicture)}
            style={{
              border: "3px solid #d9d9d9",
              opacity: disabled ? 0.6 : 1,
              display: "inline-block",
            }}
          >
            {!currentPicture && (
              <span
                style={{
                  fontSize: size * 0.4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  width: "100%",
                }}
              >
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </span>
            )}
          </Avatar>
          {showLabel && !disabled && (
            <div
              style={{
                textAlign: "center",
                marginTop: "8px",
                fontSize: "12px",
                color: "#666",
              }}
            >
              {directMode
                ? t("auth.profilePicture") || "Profile Picture"
                : t("profile.clickToChange") || "Click to change"}
            </div>
          )}
        </div>
      )}

      {directMode || !isOwnProfile ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginTop: hideAvatar ? "0" : "16px",
          }}
        >
          {tempPicture ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <Avatar size={120} src={getProfilePictureUrl(tempPicture)} />
              <Button onClick={removePhoto} disabled={disabled} block>
                {t("auth.removePhoto") || "Remove Photo"}
              </Button>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                id="file-input"
              />
              <label htmlFor="file-input" style={{ width: "100%" }}>
                <Button
                  icon={<UploadOutlined />}
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                  block
                >
                  {t("auth.selectImage") || "Select Image"}
                </Button>
              </label>
              {!isCameraActive ? (
                <Button
                  icon={<CameraOutlined />}
                  onClick={startCamera}
                  disabled={disabled}
                  block
                >
                  {t("auth.takePhoto") || "Take Photo"}
                </Button>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "auto",
                      borderRadius: "8px",
                      backgroundColor: "#000",
                    }}
                  />
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Button
                      onClick={capturePhoto}
                      type="primary"
                      size="large"
                      disabled={disabled}
                      block
                    >
                      {t("auth.capture") || "Capture"}
                    </Button>
                    <Button
                      onClick={stopCamera}
                      size="large"
                      disabled={disabled}
                      block
                    >
                      {t("auth.cancel") || "Cancel"}
                    </Button>
                  </Space>
                </div>
              )}
            </div>
          )}
        </div>
      ) : isOwnProfile ? (
        <Modal
          title={t("profile.changeProfilePicture") || "Change Profile Picture"}
          open={isModalVisible}
          onCancel={handleCancel}
          footer={[
            <div key="footer-buttons" style={{ display: "flex", gap: "8px" }}>
              <Button key="cancel" onClick={handleCancel} style={{ flex: 1 }}>
                {t("auth.cancel") || "Cancel"}
              </Button>
              <Button
                key="save"
                type="primary"
                onClick={handleSave}
                disabled={tempPicture === currentPicture}
                style={{ flex: 1 }}
              >
                {t("common.save") || "Save"}
              </Button>
            </div>,
          ]}
          width={600}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {currentPicture && tempPicture === null && !hasStartedEditing && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {t("profile.currentPicture") || "Current Profile Picture"}
                </div>
                <Avatar
                  size={400}
                  src={getProfilePictureUrl(currentPicture)}
                  style={{ border: "3px solid #d9d9d9" }}
                />
              </div>
            )}
            {tempPicture ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {t("profile.currentPicture") || "Current Profile Picture"}
                </div>
                <Avatar
                  size={400}
                  src={tempPicture}
                  style={{ border: "3px solid #1890ff" }}
                />
                <Button onClick={removePhoto} block>
                  {t("auth.removePhoto") || "Remove Photo"}
                </Button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {t("profile.currentPicture") || "Current Profile Picture"}
                </div>
                <Avatar
                  size={400}
                  style={{
                    border: "3px solid #d9d9d9",
                    backgroundColor: "#f0f0f0",
                  }}
                >
                  <span style={{ fontSize: "120px" }}>
                    {userName?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </Avatar>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    id="file-input"
                  />
                  <label htmlFor="file-input" style={{ width: "100%" }}>
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => fileInputRef.current?.click()}
                      block
                    >
                      {t("auth.selectImage") || "Select Image"}
                    </Button>
                  </label>
                  {!isCameraActive ? (
                    <Button
                      icon={<CameraOutlined />}
                      onClick={startCamera}
                      block
                    >
                      {t("auth.takePhoto") || "Take Photo"}
                    </Button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        width: "100%",
                      }}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: "100%",
                          height: "auto",
                          borderRadius: "8px",
                          backgroundColor: "#000",
                        }}
                      />
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Button
                          onClick={capturePhoto}
                          type="primary"
                          size="large"
                          block
                        >
                          {t("auth.capture") || "Capture"}
                        </Button>
                        <Button onClick={stopCamera} size="large" block>
                          {t("auth.cancel") || "Cancel"}
                        </Button>
                      </Space>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {loadingHistory ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Spin />
            </div>
          ) : history.length > 0 ? (
            <Collapse
              style={{ marginTop: "12px" }}
              items={[
                {
                  key: "1",
                  label: `${t("profile.pictureHistory") || "Profile Picture History"} (${history.length})`,
                  children: (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      {history.map((entry) => (
                        <div
                          key={entry.id}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            padding: "12px",
                            border: entry.is_candidate
                              ? "2px solid #1890ff"
                              : "1px solid #f0f0f0",
                            borderRadius: "4px",
                            backgroundColor: entry.is_candidate
                              ? "#f5f7ff"
                              : "transparent",
                          }}
                        >
                          <Avatar
                            size={200}
                            src={getProfilePictureUrl(entry.profile_picture)}
                            style={{
                              border: entry.is_candidate
                                ? "3px solid #1890ff"
                                : "2px solid #d9d9d9",
                            }}
                          />
                          <div
                            style={{
                              textAlign: "center",
                              fontSize: "12px",
                              color: "#666",
                            }}
                          >
                            <div>
                              {new Date(entry.created_at).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </div>
                            {entry.level_name && (
                              <div>
                                Level: {t(entry.level_name)} (ID:{" "}
                                {entry.level_id})
                              </div>
                            )}
                            {entry.is_candidate && (
                              <div
                                style={{
                                  marginTop: "4px",
                                  color: "#1890ff",
                                  fontWeight: "bold",
                                }}
                              >
                                ✓{" "}
                                {t("image.generationCandidate") ||
                                  "Generation Candidate"}
                              </div>
                            )}
                          </div>
                          {isOwnProfile && (
                            <Button
                              size="small"
                              onClick={() => handleSetCandidate(entry.id)}
                              disabled={entry.is_candidate || settingCandidate}
                              loading={
                                settingCandidate &&
                                candidatePictureId === entry.id
                              }
                            >
                              {entry.is_candidate
                                ? t("image.candidateSelected") || "Selected"
                                : t("image.setAsCandidate") ||
                                  "Set as Candidate"}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          ) : null}
        </Modal>
      ) : (
        <Modal
          title={t("profile.viewProfilePicture") || "View Profile Picture"}
          open={isModalVisible}
          onCancel={handleCancel}
          footer={[
            <Button
              key="close"
              onClick={handleCancel}
              style={{ width: "100%" }}
            >
              {t("auth.close") || "Close"}
            </Button>,
          ]}
          width={600}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {currentPicture && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {t("profile.currentPicture") || "Current Profile Picture"}
                </div>
                <Avatar
                  size={400}
                  src={getProfilePictureUrl(currentPicture)}
                  style={{ border: "3px solid #d9d9d9" }}
                >
                  {!currentPicture && (
                    <span style={{ fontSize: "120px" }}>
                      {userName?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  )}
                </Avatar>
              </div>
            )}

            {loadingHistory ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <Spin />
              </div>
            ) : history.length > 0 ? (
              <Collapse
                items={[
                  {
                    key: "1",
                    label: `${t("profile.pictureHistory") || "Profile Picture History"} (${history.length})`,
                    children: (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                        }}
                      >
                        {history.map((entry) => (
                          <div
                            key={entry.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "8px",
                              padding: "12px",
                              border: "1px solid #f0f0f0",
                              borderRadius: "4px",
                            }}
                          >
                            <Avatar
                              size={200}
                              src={getProfilePictureUrl(entry.profile_picture)}
                              style={{ border: "2px solid #d9d9d9" }}
                            />
                            <div
                              style={{
                                textAlign: "center",
                                fontSize: "12px",
                                color: "#666",
                              }}
                            >
                              <div>
                                {new Date(entry.created_at).toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                              {entry.level_name && (
                                <div>
                                  Level: {entry.level_name} (ID:{" "}
                                  {entry.level_id})
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty
                description={t("profile.noHistoryYet") || "No history yet"}
              />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
