import React, { useState, useRef, useEffect } from 'react';
import { Button, Upload, Avatar, Space, Modal, message } from 'antd';
import { CameraOutlined, UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface ProfilePictureManagerProps {
    currentPicture?: string | null;
    onPictureChange: (picture: string | null) => void;
    disabled?: boolean;
    size?: number;
    showLabel?: boolean;
    directMode?: boolean; // New prop for RegisterView
    hideAvatar?: boolean; // New prop to hide avatar in direct mode
    userName?: string; // New prop for user's name to show correct letter
}

export function ProfilePictureManager({ 
    currentPicture, 
    onPictureChange, 
    disabled = false,
    size = 120,
    showLabel = true,
    directMode = false,
    hideAvatar = false,
    userName
}: ProfilePictureManagerProps) {
    const { t } = useTranslation();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [tempPicture, setTempPicture] = useState<string | null>(currentPicture || null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset temp picture when modal opens or when in direct mode
    useEffect(() => {
        if (isModalVisible || directMode) {
            setTempPicture(currentPicture || null);
        }
    }, [isModalVisible, currentPicture, directMode]);

    // Handle video element when camera becomes active
    React.useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            const video = videoRef.current;
            const stream = streamRef.current;
            
            video.srcObject = stream;
            
            const tryPlay = () => {
                if (video.readyState >= 2 && video.srcObject) {
                    video.play().catch(err => {
                        console.error('Error playing video stream:', err);
                    });
                }
            };

            tryPlay();
            
            const handleCanPlay = () => tryPlay();
            const handleLoadedMetadata = () => tryPlay();
            
            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            
            return () => {
                video.removeEventListener('canplay', handleCanPlay);
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        }
    }, [isCameraActive]);
    
    // Cleanup camera stream on unmount
    React.useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
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
            };
            reader.readAsDataURL(file);
        }
    };
    
    const startCamera = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('MEDIA_DEVICES_NOT_AVAILABLE');
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            setIsCameraActive(true);
        } catch (err: any) {
            console.error('Camera error:', err);
            setIsCameraActive(false);
            let errorMessage = t("auth.cameraError");
            
            const errorName = err?.name || '';
            const errorMsg = err?.message || '';
            
            if (errorMsg === 'MEDIA_DEVICES_NOT_AVAILABLE') {
                errorMessage = t("auth.cameraNotSupported");
            } else if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
                errorMessage = t("auth.cameraPermissionDenied");
            } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
                errorMessage = t("auth.cameraNotFound");
            } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
                errorMessage = t("auth.cameraInUse");
            } else if (errorName === "NotSupportedError" || errorName === "ConstraintNotSatisfiedError") {
                errorMessage = t("auth.cameraNotSupported");
            } else if (errorName === "TypeError") {
                if (errorMsg.includes('getUserMedia') || errorMsg.includes('mediaDevices') || errorMsg.includes('Cannot read')) {
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
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };
    
    const capturePhoto = () => {
        if (videoRef.current && isCameraActive) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setTempPicture(dataUrl);
                stopCamera();
            }
        }
    };
    
    const removePhoto = () => {
        setTempPicture(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = () => {
        onPictureChange(tempPicture);
        setIsModalVisible(false);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setTempPicture(currentPicture || null);
        stopCamera();
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
                        cursor: disabled ? 'default' : (directMode ? 'default' : 'pointer'),
                        display: 'inline-block',
                        minWidth: size,
                        minHeight: size,
                        textAlign: 'center'
                    }}
                >
                    <Avatar
                        size={size}
                        src={currentPicture}
                        style={{ 
                            border: '3px solid #d9d9d9',
                            opacity: disabled ? 0.6 : 1,
                            display: 'inline-block'
                        }}
                    >
                        {!currentPicture && (
                            <span style={{ 
                                fontSize: size * 0.4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                width: '100%'
                            }}>
                                {userName?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        )}
                    </Avatar>
                    {showLabel && !disabled && (
                        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#666' }}>
                            {directMode ? (t("auth.profilePicture") || "Profile Picture") : (t("profile.clickToChange") || "Click to change")}
                        </div>
                    )}
                </div>
            )}

            {directMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: (hideAvatar ? '0' : '16px') }}>
                    {tempPicture ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                            <Avatar size={120} src={tempPicture} />
                            <Button onClick={removePhoto} disabled={disabled} block>
                                {t("auth.removePhoto") || "Remove Photo"}
                            </Button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                                id="file-input"
                            />
                            <label htmlFor="file-input" style={{ width: '100%' }}>
                                <Button icon={<UploadOutlined />} disabled={disabled} onClick={() => fileInputRef.current?.click()} block>
                                    {t("auth.selectImage") || "Select Image"}
                                </Button>
                            </label>
                            {!isCameraActive ? (
                                <Button icon={<CameraOutlined />} onClick={startCamera} disabled={disabled} block>
                                    {t("auth.takePhoto") || "Take Photo"}
                                </Button>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        style={{ 
                                            width: '100%', 
                                            height: 'auto',
                                            borderRadius: '8px',
                                            backgroundColor: '#000'
                                        }}
                                    />
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button onClick={capturePhoto} type="primary" size="large" disabled={disabled} block>
                                            {t("auth.capture") || "Capture"}
                                        </Button>
                                        <Button onClick={stopCamera} size="large" disabled={disabled} block>
                                            {t("auth.cancel") || "Cancel"}
                                        </Button>
                                    </Space>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <Modal
                    title={t("profile.changeProfilePicture") || "Change Profile Picture"}
                    open={isModalVisible}
                    onCancel={handleCancel}
                    footer={[
                        <div key="footer-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <Button key="cancel" onClick={handleCancel} style={{ flex: 1 }}>
                                {t("auth.cancel") || "Cancel"}
                            </Button>
                            <Button key="save" type="primary" onClick={handleSave} style={{ flex: 1 }}>
                                {t("common.save") || "Save"}
                            </Button>
                        </div>
                    ]}
                    width={400}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {tempPicture ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                                <Avatar size={120} src={tempPicture} />
                                <Button onClick={removePhoto} block>
                                    {t("auth.removePhoto") || "Remove Photo"}
                                </Button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                    id="file-input"
                                />
                                <label htmlFor="file-input" style={{ width: '100%' }}>
                                    <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} block>
                                        {t("auth.selectImage") || "Select Image"}
                                    </Button>
                                </label>
                                {!isCameraActive ? (
                                    <Button icon={<CameraOutlined />} onClick={startCamera} block>
                                        {t("auth.takePhoto") || "Take Photo"}
                                    </Button>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            style={{ 
                                                width: '100%', 
                                                height: 'auto',
                                                borderRadius: '8px',
                                                backgroundColor: '#000'
                                            }}
                                        />
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Button onClick={capturePhoto} type="primary" size="large" block>
                                                {t("auth.capture") || "Capture"}
                                            </Button>
                                            <Button onClick={stopCamera} size="large" block>
                                                {t("auth.cancel") || "Cancel"}
                                            </Button>
                                        </Space>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </>
    );
}
