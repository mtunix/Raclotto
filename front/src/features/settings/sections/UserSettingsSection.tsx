import { Card, Form, Input, Alert, Button, ColorPicker, Divider, Select, Switch, Typography } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { TagChipGroup } from "../../../shared/TagChipGroup";
import { ChangePasswordSection } from "./ChangePasswordSection";
import { useUserSettingsForm } from "./useUserSettingsForm";
import "../SettingsView.css";

const { Text } = Typography;

const DIET_OPTIONS = [
    { name: "meat", key: "tags.meat" },
    { name: "vegetarian", key: "tags.vegetarian" },
    { name: "vegan", key: "tags.vegan" },
    { name: "fish", key: "tags.fish" },
    { name: "histamine", key: "tags.histamine" },
    { name: "gluten", key: "tags.gluten" },
    { name: "fructose", key: "tags.fructose" },
    { name: "lactose", key: "tags.lactose" },
];

// The card decorations unlock by level.
const BORDER_STYLE_LEVEL = 3;
const BORDER_TEXTURE_LEVEL = 5;
const GLOW_LEVEL = 7;

export function UserSettingsSection() {
    const { t } = useTranslation();
    const { me, loading, saving, profile, diet, dirty, change, setChecked, save } = useUserSettingsForm();
    const level = me?.level ? Number(me.level.id) : 0;
    const styleUnlocked = level >= BORDER_STYLE_LEVEL;
    const textureUnlocked = level >= BORDER_TEXTURE_LEVEL;
    const glowUnlocked = level >= GLOW_LEVEL;

    return (
        <div className="settings-user-tab">
            {loading || !profile ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Button type="text" disabled>
                        <span style={{ marginRight: 8 }}>
                            <Text>{t("common.loading")}</Text>
                        </span>
                    </Button>
                </div>
            ) : (
                <Card 
                    className="settings-card"
                    styles={{ body: { padding: '24px' } }}
                >
                    <Form.Item 
                        label={<span className="settings-section-title">{t("settings.iAm")}</span>} 
                        className="settings-form-item-spacing"
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <Input
                            size="large"
                            value={profile.name}
                            onChange={(e) => change("name", e.target.value)}
                            placeholder={t("common.enterName")}
                            disabled={saving}
                        />
                    </Form.Item>

                    {/* Border Customization Section */}
                    <div className="settings-section-divider">
                        <Divider className="settings-section-divider-inner">
                            <span className="settings-section-title">
                                {t("settings.borderCustomization")}
                            </span>
                        </Divider>
                    </div>

                    <Alert
                        title={t("settings.borderCustomizationInfo")}
                        type="info"
                        showIcon
                        className="settings-alert-spacing"
                    />

                    {/* Border Color */}
                    <Form.Item 
                        label={<span className="settings-section-title">
                            {t("settings.color")}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <div style={{ width: '100%', display: 'block' }}>
                            <ColorPicker
                                value={profile.color}
                                onChangeComplete={(color) => change("color", color.toHexString())}
                                disabled={saving}
                                showText
                                format="hex"
                                style={{ width: '100%', display: 'block' }}
                            />
                        </div>
                    </Form.Item>

                    {/* Border Style - disabled when texture is selected */}
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: profile.border_texture ? '#d9d9d9' : '#1d1d1f' }}>
                            {t("settings.borderStyle")}
                            {!styleUnlocked && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                            {profile.border_texture && styleUnlocked && (
                                <Text type="secondary" style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 'normal' }}>
                                    ({t("settings.disabledWithTexture")})
                                </Text>
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <div style={{ opacity: profile.border_texture ? 0.6 : 1 }}>
                            <Select
                                value={profile.border_style}
                                onChange={(value) => change("border_style", value)}
                                disabled={saving || !styleUnlocked || !!profile.border_texture}
                                size="large"
                                style={{ width: '100%' }}
                                options={[
                                    { value: "solid", label: t("borderStyle.solid") },
                                    { value: "dashed", label: t("borderStyle.dashed") },
                                    { value: "dotted", label: t("borderStyle.dotted") },
                                    { value: "double", label: t("borderStyle.double") },
                                ]}
                            />
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            {profile.border_texture ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.styleDisabledInfo")}
                                </Text>
                            ) : styleUnlocked ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderStyleUnlocked")}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderStyleLocked")}
                                </Text>
                            )}
                        </div>
                    </Form.Item>

                    {/* Border Texture - shown last as it's unlocked at level 5 */}
                    <Form.Item 
                        label={<span className="settings-section-title">
                            {t("settings.borderTexture")}
                            {!textureUnlocked && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <Select
                            value={profile.border_texture || undefined}
                            onChange={(value) => change("border_texture", value || null)}
                            disabled={saving || !textureUnlocked}
                            size="large"
                            style={{ width: '100%' }}
                            allowClear
                            placeholder={t("settings.noTexture")}
                            options={[
                                { value: "", label: t("settings.noTexture") },
                                { value: "cheese", label: t("texture.cheese") },
                                { value: "bread", label: t("texture.bread") },
                                { value: "sauce-01", label: t("texture.sauce01") },
                                { value: "sauce-02", label: t("texture.sauce02") },
                                { value: "herbs-01", label: t("texture.herbs01") },
                                { value: "herbs-02", label: t("texture.herbs02") },
                            ]}
                        />
                        <div style={{ marginTop: '8px' }}>
                            {textureUnlocked ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderTextureUnlocked")}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderTextureLocked")}
                                </Text>
                            )}
                        </div>
                    </Form.Item>

                    {/* Glow Effect - unlocked at level 7 */}
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                            {t("settings.glowEffect")}
                            {!glowUnlocked && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <div style={{ opacity: glowUnlocked ? 1 : 0.6 }}>
                            <Switch
                                checked={profile.glow_effect}
                                onChange={(checked) => change("glow_effect", checked)}
                                disabled={saving || !glowUnlocked}
                                size="medium"
                            />
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            {glowUnlocked ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.glowEffectUnlocked")}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.glowEffectLocked")}
                                </Text>
                            )}
                        </div>
                    </Form.Item>

                    <Form.Item 
                        label={<span className="settings-section-title">{t("settings.language")}</span>} 
                        className="settings-form-item-spacing"
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <Select
                            value={profile.language}
                            onChange={(value) => change("language", value)}
                            disabled={saving}
                            size="large"
                            style={{ width: '100%' }}
                            options={[
                                { value: "en", label: "English" },
                                { value: "de", label: "Deutsch" },
                            ]}
                        />
                        <div className="settings-help-text">
                            <Text type="secondary" className="settings-help-text-small">
                                {t("settings.languageDescription")}
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
                            options={DIET_OPTIONS}
                            values={diet}
                            onChange={setChecked}
                            disabled={saving}
                            allowWrap
                        />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            size="large"
                            onClick={save}
                            loading={saving}
                            disabled={!dirty || saving}
                            block
                            className="settings-save-button-large"
                        >
                            {t("common.save")}
                        </Button>
                    </Form.Item>
                </Card>
            )}
            <ChangePasswordSection />
        </div>
    );
}
