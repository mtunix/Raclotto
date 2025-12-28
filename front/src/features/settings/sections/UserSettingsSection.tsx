import React from "react";
import { Card, Form, Input, Alert, Button, ColorPicker, Divider, Select, Switch, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { TagChipGroup } from "../../../shared/components/common/TagChipGroup";
import "../SettingsView.css";

const { Text } = Typography;

interface OptionItem {
    name: string;
    key: string;
}

interface UserSettingsSectionProps {
    t: (key: string) => string;
    userLoading: boolean;
    userSaving: boolean;
    userName: string;
    userColor: string;
    userLanguage: string;
    borderStyle: string;
    borderTexture: string | null;
    glowEffect: boolean;
    options: OptionItem[];
    tagValues: Record<string, boolean>;
    currentUser: any;
    isUserSettingsDirty: () => boolean;
    onUserNameChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUserColorChanged: (color: string) => void;
    setUserLanguage: (lang: string) => void;
    setBorderStyle: (style: string) => void;
    setBorderTexture: (texture: string | null) => void;
    setGlowEffect: (val: boolean) => void;
    setChecked: (type: string, checked: boolean) => void;
    handleSaveUserSettings: () => void;
}

export function UserSettingsSection(props: UserSettingsSectionProps) {
    const {
        t,
        userLoading,
        userSaving,
        userName,
        userColor,
        userLanguage,
        borderStyle,
        borderTexture,
        glowEffect,
        options,
        tagValues,
        currentUser,
        isUserSettingsDirty,
        onUserNameChanged,
        onUserColorChanged,
        setUserLanguage,
        setBorderStyle,
        setBorderTexture,
        setGlowEffect,
        setChecked,
        handleSaveUserSettings,
    } = props;

    // Debug level data
    console.log('UserSettingsSection Debug:', {
        currentUser,
        level: currentUser?.level,
        levelId: currentUser?.level?.id,
        levelIdType: typeof currentUser?.level?.id,
        parsedLevelId: currentUser?.level ? parseInt(currentUser.level.id.toString(), 10) : 'N/A'
    });

    return (
        <div className="settings-user-tab">
            {userLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Button type="text" disabled>
                        <span style={{ marginRight: 8 }}>
                            <Text>{t("common.loading") || "Loading..."}</Text>
                        </span>
                    </Button>
                </div>
            ) : (
                <Card 
                    className="settings-card"
                    bodyStyle={{ padding: '24px' }}
                >
                    <Form.Item 
                        label={<span className="settings-section-title">{t("settings.iAm")}</span>} 
                        className="settings-form-item-spacing"
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <Input
                            size="large"
                            value={userName}
                            onChange={onUserNameChanged}
                            placeholder={t("common.enterName")}
                            disabled={userSaving}
                        />
                    </Form.Item>

                    {/* Border Customization Section */}
                    <div className="settings-section-divider">
                        <Divider className="settings-section-divider-inner">
                            <span className="settings-section-title">
                                {t("settings.borderCustomization") || "Border Customization"}
                            </span>
                        </Divider>
                    </div>

                    <Alert
                        message={t("settings.borderCustomizationInfo") || "Customize your pan borders with colors, styles, and textures."}
                        type="info"
                        showIcon
                        className="settings-alert-spacing"
                    />

                    {/* Border Color */}
                    <Form.Item 
                        label={<span className="settings-section-title">
                            {t("settings.color") || "Color"}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <div style={{ width: '100%', display: 'block' }}>
                            <ColorPicker
                                value={userColor}
                                onChangeComplete={(color) => onUserColorChanged(color.toHexString())}
                                disabled={userSaving}
                                showText
                                format="hex"
                                style={{ width: '100%', display: 'block' }}
                            />
                        </div>
                    </Form.Item>

                    {/* Border Style - disabled when texture is selected */}
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: borderTexture ? '#d9d9d9' : '#1d1d1f' }}>
                            {t("settings.borderStyle") || "Border Style"}
                            {currentUser?.level && parseInt(currentUser.level.id.toString(), 10) < 3 && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                            {borderTexture && currentUser?.level && parseInt(currentUser.level.id.toString(), 10) >= 3 && (
                                <Text type="secondary" style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 'normal' }}>
                                    ({t("settings.disabledWithTexture") || "Disabled when texture is active"})
                                </Text>
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <div style={{ opacity: borderTexture ? 0.6 : 1 }}>
                            <Select
                                value={borderStyle}
                                onChange={(value) => setBorderStyle(value)}
                                disabled={(() => {
        const isDisabled = userSaving || (currentUser?.level ? parseInt(currentUser.level.id.toString(), 10) < 3 : true) || !!borderTexture;
        console.log('Border Style Disabled Logic:', {
            userSaving,
            hasLevel: !!currentUser?.level,
            levelId: currentUser?.level?.id,
            parsedLevelId: currentUser?.level ? parseInt(currentUser.level.id.toString(), 10) : 'N/A',
            levelCheck: currentUser?.level ? parseInt(currentUser.level.id.toString(), 10) < 3 : true,
            borderTexture: !!borderTexture,
            finalDisabled: isDisabled
        });
        return isDisabled;
    })()}
                                size="large"
                                style={{ width: '100%' }}
                            >
                                <Select.Option value="solid">{t("borderStyle.solid") || "Solid"}</Select.Option>
                                <Select.Option value="dashed">{t("borderStyle.dashed") || "Dashed"}</Select.Option>
                                <Select.Option value="dotted">{t("borderStyle.dotted") || "Dotted"}</Select.Option>
                                <Select.Option value="double">{t("borderStyle.double") || "Double"}</Select.Option>
                            </Select>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            {borderTexture ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.styleDisabledInfo") || "Style is not applied when a texture is selected."}
                                </Text>
                            ) : currentUser?.level && parseInt(currentUser.level.id.toString(), 10) >= 3 ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderStyleUnlocked") || "Unlocked at level 3"}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderStyleLocked") || "Locked - Reach level 3 to unlock"}
                                </Text>
                            )}
                        </div>
                    </Form.Item>

                    {/* Border Texture - shown last as it's unlocked at level 5 */}
                    <Form.Item 
                        label={<span className="settings-section-title">
                            {t("settings.borderTexture") || "Border Texture"}
                            {currentUser?.level && parseInt(currentUser.level.id.toString(), 10) < 5 && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <Select
                            value={borderTexture || undefined}
                            onChange={(value) => setBorderTexture(value || null)}
                            disabled={userSaving || (currentUser?.level ? parseInt(currentUser.level.id.toString(), 10) < 5 : true)}
                            size="large"
                            style={{ width: '100%' }}
                            allowClear
                            placeholder={t("settings.noTexture") || "No texture"}
                        >
                            <Select.Option value={null}>{t("settings.noTexture") || "No texture"}</Select.Option>
                            <Select.Option value="cheese">{t("texture.cheese") || "Cheese"}</Select.Option>
                            <Select.Option value="bread">{t("texture.bread") || "Bread"}</Select.Option>
                            <Select.Option value="sauce-01">{t("texture.sauce01") || "Sauce 1"}</Select.Option>
                            <Select.Option value="sauce-02">{t("texture.sauce02") || "Sauce 2"}</Select.Option>
                            <Select.Option value="herbs-01">{t("texture.herbs01") || "Herbs 1"}</Select.Option>
                            <Select.Option value="herbs-02">{t("texture.herbs02") || "Herbs 2"}</Select.Option>
                        </Select>
                        <div style={{ marginTop: '8px' }}>
                            {currentUser?.level && parseInt(currentUser.level.id.toString(), 10) >= 5 ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderTextureUnlocked") || "Unlocked at level 5"}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderTextureLocked") || "Locked - Reach level 5 to unlock"}
                                </Text>
                            )}
                        </div>
                    </Form.Item>

                    {/* Glow Effect - unlocked at level 7 */}
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                            {t("settings.glowEffect") || "Card Glow Effect"}
                            {currentUser?.level && parseInt(currentUser.level.id.toString(), 10) < 7 && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <div style={{ opacity: (currentUser?.level ? parseInt(currentUser.level.id.toString(), 10) < 7 : true) ? 0.6 : 1 }}>
                            <Switch
                                checked={glowEffect}
                                onChange={(checked) => setGlowEffect(checked)}
                                disabled={userSaving || (currentUser?.level ? parseInt(currentUser.level.id.toString(), 10) < 7 : true)}
                                size="default"
                            />
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            {currentUser?.level && parseInt(currentUser.level.id.toString(), 10) >= 7 ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.glowEffectUnlocked") || "Unlocked at level 7"}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.glowEffectLocked") || "Locked - Reach level 7 to unlock"}
                                </Text>
                            )}
                        </div>
                    </Form.Item>

                    <Form.Item 
                        label={<span className="settings-section-title">{t("settings.language") || "Language"}</span>} 
                        className="settings-form-item-spacing"
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <Select
                            value={userLanguage}
                            onChange={(value) => setUserLanguage(value)}
                            disabled={userSaving}
                            size="large"
                            style={{ width: '100%' }}
                        >
                            <Select.Option value="en">English</Select.Option>
                            <Select.Option value="de">Deutsch</Select.Option>
                        </Select>
                        <div className="settings-help-text">
                            <Text type="secondary" className="settings-help-text-small">
                                {t("settings.languageDescription") || "Select your preferred language"}
                            </Text>
                        </div>
                    </Form.Item>
                    <Form.Item 
                        label={<span className="settings-section-title">{t("settings.allOkToSnack")}</span>} 
                        className="settings-form-item-spacing"
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <TagChipGroup
                            options={options}
                            values={tagValues}
                            onChange={setChecked}
                            disabled={userSaving}
                            allowWrap
                        />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleSaveUserSettings}
                            loading={userSaving}
                            disabled={!isUserSettingsDirty() || userSaving}
                            block
                            className="settings-save-button-large"
                        >
                            {t("common.save") || "Save"}
                        </Button>
                    </Form.Item>
                </Card>
            )}
        </div>
    );
}
