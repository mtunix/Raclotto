import React, { useState, useRef, useMemo } from 'react';
import { Form, Input, Button, Card, Alert, Space, Upload, Avatar } from 'antd';
import { CameraOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Api } from '../lib/api';
import { useAuthStore } from '../AuthSlice';
import { useTranslation } from 'react-i18next';
import { TagChipGroup } from './common/TagChipGroup';

export function RegisterView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Dietary preferences state
    const [meat, setMeat] = useState(false);
    const [vegetarian, setVegetarian] = useState(true);
    const [vegan, setVegan] = useState(true);
    const [fish, setFish] = useState(false);
    const [gluten, setGluten] = useState(true);
    const [histamine, setHistamine] = useState(true);
    const [fructose, setFructose] = useState(true);
    const [lactose, setLactose] = useState(true);
    
    // Handle video element when camera becomes active
    React.useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            const video = videoRef.current;
            const stream = streamRef.current;
            
            // Set the stream to the video element
            video.srcObject = stream;
            
            // Ensure video plays when it's ready
            const tryPlay = () => {
                if (video.readyState >= 2 && video.srcObject) {
                    video.play().catch(err => {
                        console.error('Error playing video stream:', err);
                    });
                }
            };
            
            // Try immediately if already ready
            tryPlay();
            
            // Also listen for events
            const handleCanPlay = () => tryPlay();
            const handleLoadedMetadata = () => tryPlay();
            
            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            video.addEventListener('playing', () => {
                console.log('Video is playing');
            });
            
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
    
    const options = [
        {"name": "meat", "key": "tags.meat"},
        {"name": "vegetarian", "key": "tags.vegetarian"},
        {"name": "vegan", "key": "tags.vegan"},
        {"name": "fish", "key": "tags.fish"},
        {"name": "histamine", "key": "tags.histamine"},
        {"name": "gluten", "key": "tags.gluten"},
        {"name": "fructose", "key": "tags.fructose"},
        {"name": "lactose", "key": "tags.lactose"},
    ];

    function setChecked(type: string, checked: boolean) {
        // Update local state immediately for responsive UI
        switch (type) {
            case "vegetarian":
                if (!checked) {
                    setVegan(true);
                }
                setVegetarian(checked);
                break;
            case "meat":
                if (!checked) {
                    setVegetarian(true);
                    setVegan(true);
                }
                setMeat(checked);
                break;
            case "vegan":
                setVegan(checked);
                break;
            case "fish":
                setFish(checked);
                break;
            case "gluten":
                setGluten(checked);
                break;
            case "histamine":
                setHistamine(checked);
                break;
            case "fructose":
                setFructose(checked);
                break;
            case "lactose":
                setLactose(checked);
                break;
        }
    }

    function getValue(type: string): boolean {
        switch (type) {
            case "meat": return meat;
            case "vegetarian": return vegetarian;
            case "vegan": return vegan;
            case "gluten": return gluten;
            case "histamine": return histamine;
            case "fructose": return fructose;
            case "lactose": return lactose;
            default: return false;
        }
    }

    const tagValues = useMemo(() => ({
        meat,
        vegetarian,
        vegan,
        fish,
        gluten,
        histamine,
        fructose,
        lactose,
    }), [meat, vegetarian, vegan, fish, gluten, histamine, fructose, lactose]);
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError(t("auth.invalidImageType"));
                return;
            }
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                setError(t("auth.imageTooLarge"));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setProfilePicture(result);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const startCamera = async () => {
        setError(null);
        setIsCameraActive(false);
        
        // Try to access camera with basic constraints
        // Desktop cameras typically don't support facingMode, so we start simple
        try {
            // Check if API exists, but don't fail early - let try-catch handle it
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('MEDIA_DEVICES_NOT_AVAILABLE');
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            setIsCameraActive(true);
            setError(null);
        } catch (err: any) {
            console.error('Camera error:', err, 'Error name:', err?.name, 'Error message:', err?.message);
            setIsCameraActive(false);
            let errorMessage = t("auth.cameraError");
            
            // Handle specific error types with proper error names
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
                // Check if it's specifically about getUserMedia not being available
                if (errorMsg.includes('getUserMedia') || errorMsg.includes('mediaDevices') || errorMsg.includes('Cannot read')) {
                    errorMessage = t("auth.cameraNotSupported");
                } else {
                    errorMessage = t("auth.cameraError");
                }
            } else {
                // Generic error - show a helpful message
                errorMessage = t("auth.cameraError");
            }
            setError(errorMessage);
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
                setProfilePicture(dataUrl);
                stopCamera();
            }
        }
    };
    
    const removePhoto = () => {
        setProfilePicture(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onFinish = async (values: { token: string; email: string; name: string; password: string; confirmPassword: string }) => {
        if (values.password !== values.confirmPassword) {
            setError(t("auth.passwordsDoNotMatch"));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await Api.register(values.token, values.email, values.name, values.password, profilePicture || undefined);
            login(result.token, {
                id: 0, // Will be updated by /auth/me
                name: result.user.name,
                email: result.user.email,
                meat: meat,
                vegetarian: vegetarian,
                vegan: vegan,
                fish: fish,
                histamine: histamine,
                fructose: fructose,
                lactose: lactose,
                gluten: gluten,
            });
            // Fetch full user data and update dietary preferences
            try {
                const user = await Api.getCurrentUser();
                const userLanguage = user.language || 'de';
                // Update dietary preferences
                const updateData: any = {
                    meat: meat,
                    vegetarian: vegetarian,
                    vegan: vegan,
                    fish: fish,
                    histamine: histamine,
                    fructose: fructose,
                    lactose: lactose,
                    gluten: gluten,
                    language: userLanguage,
                };
                // Handle hierarchical logic: if meat is unchecked, ensure vegetarian and vegan are true
                if (!meat) {
                    updateData.vegetarian = true;
                    updateData.vegan = true;
                }
                // If vegetarian is unchecked, ensure vegan is true
                if (!vegetarian) {
                    updateData.vegan = true;
                }
                await Api.updateCurrentUser(updateData);
                
                // Reload user data to get updated values
                const updatedUser = await Api.getCurrentUser();
                login(result.token, {
                    id: updatedUser.id || 0,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    meat: updatedUser.meat || false,
                    vegetarian: updatedUser.vegetarian !== undefined ? updatedUser.vegetarian : true,
                    vegan: updatedUser.vegan !== undefined ? updatedUser.vegan : true,
                    fish: updatedUser.fish || false,
                    histamine: updatedUser.histamine !== undefined ? updatedUser.histamine : true,
                    fructose: updatedUser.fructose !== undefined ? updatedUser.fructose : true,
                    lactose: updatedUser.lactose !== undefined ? updatedUser.lactose : true,
                    gluten: updatedUser.gluten !== undefined ? updatedUser.gluten : true,
                    profile_picture: updatedUser.profile_picture,
                });
            } catch (e) {
                console.error("Failed to fetch or update user data:", e);
            }
            navigate("/");
        } catch (err: any) {
            setError(err.message || t("auth.registrationFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', padding: '40px 24px' }}>
            <Card title={t("auth.register")} style={{ width: '100%', maxWidth: 420 }}>
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError(null)}
                        style={{ marginBottom: 24 }}
                    />
                )}
                <Form
                    name="register"
                    onFinish={onFinish}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label={t("auth.inviteToken")}
                        name="token"
                        rules={[{ required: true, message: t("auth.inviteTokenRequired") }]}
                        style={{ marginBottom: 24 }}
                    >
                        <Input size="large" placeholder={t("auth.inviteTokenPlaceholder")} />
                    </Form.Item>

                    <Form.Item
                        label={t("auth.email")}
                        name="email"
                        rules={[
                            { required: true, message: t("auth.emailRequired") },
                            { type: 'email', message: t("auth.emailInvalid") }
                        ]}
                        style={{ marginBottom: 24 }}
                    >
                        <Input size="large" placeholder={t("auth.emailPlaceholder")} />
                    </Form.Item>

                    <Form.Item
                        label={t("auth.name")}
                        name="name"
                        rules={[{ required: true, message: t("auth.nameRequired") }]}
                        style={{ marginBottom: 24 }}
                    >
                        <Input size="large" placeholder={t("auth.namePlaceholder")} />
                    </Form.Item>

                    <Form.Item
                        label={t("auth.password")}
                        name="password"
                        rules={[{ required: true, message: t("auth.passwordRequired") }]}
                        style={{ marginBottom: 24 }}
                    >
                        <Input.Password size="large" placeholder={t("auth.passwordPlaceholder")} />
                    </Form.Item>

                    <Form.Item
                        label={t("auth.confirmPassword")}
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: t("auth.confirmPasswordRequired") },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(t("auth.passwordsDoNotMatch")));
                                },
                            }),
                        ]}
                        style={{ marginBottom: 24 }}
                    >
                        <Input.Password size="large" placeholder={t("auth.confirmPasswordPlaceholder")} />
                    </Form.Item>

                    <Form.Item label={t("auth.profilePicture")} style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {profilePicture ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                                    <Avatar size={120} src={profilePicture} />
                                    <Button onClick={removePhoto} disabled={loading} block>
                                        {t("auth.removePhoto")}
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
                                        <Button icon={<UploadOutlined />} disabled={loading} onClick={() => fileInputRef.current?.click()} block>
                                            {t("auth.selectImage")}
                                        </Button>
                                    </label>
                                    {!isCameraActive ? (
                                        <Button icon={<CameraOutlined />} onClick={startCamera} disabled={loading} block>
                                            {t("auth.takePhoto")}
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
                                                    {t("auth.capture")}
                                                </Button>
                                                <Button onClick={stopCamera} size="large" block>
                                                    {t("auth.cancel")}
                                                </Button>
                                            </Space>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Form.Item>

                    <Form.Item label={t("settings.allOkToSnack")} style={{ marginBottom: 24 }}>
                        <TagChipGroup
                            options={options}
                            values={tagValues}
                            onChange={setChecked}
                            disabled={loading}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 16 }}>
                        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                            {t("auth.register")}
                        </Button>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="link" block size="large" onClick={() => navigate("/login")} style={{ padding: '12px 0' }}>
                            {t("auth.haveAccount")} {t("auth.login")}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
