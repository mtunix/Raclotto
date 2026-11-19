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
                            <Text>{t("common.loading") || "Loading..."}</Text>
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
                                {t("settings.borderCustomization") || "Border Customization"}
                            </span>
                        </Divider>
                    </div>

                    <Alert
                        title={t("settings.borderCustomizationInfo") || "Customize your pan borders with colors, styles, and textures."}
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
                            {t("settings.borderStyle") || "Border Style"}
                            {!styleUnlocked && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                            {profile.border_texture && styleUnlocked && (
                                <Text type="secondary" style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 'normal' }}>
                                    ({t("settings.disabledWithTexture") || "Disabled when texture is active"})
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
                                    { value: "solid", label: t("borderStyle.solid") || "Solid" },
                                    { value: "dashed", label: t("borderStyle.dashed") || "Dashed" },
                                    { value: "dotted", label: t("borderStyle.dotted") || "Dotted" },
                                    { value: "double", label: t("borderStyle.double") || "Double" },
                                ]}
                            />
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            {profile.border_texture ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.styleDisabledInfo") || "Style is not applied when a texture is selected."}
                                </Text>
                            ) : styleUnlocked ? (
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
                            placeholder={t("settings.noTexture") || "No texture"}
                            options={[
                                { value: "", label: t("settings.noTexture") || "No texture" },
                                { value: "cheese", label: t("texture.cheese") || "Cheese" },
                                { value: "bread", label: t("texture.bread") || "Bread" },
                                { value: "sauce-01", label: t("texture.sauce01") || "Sauce 1" },
                                { value: "sauce-02", label: t("texture.sauce02") || "Sauce 2" },
                                { value: "herbs-01", label: t("texture.herbs01") || "Herbs 1" },
                                { value: "herbs-02", label: t("texture.herbs02") || "Herbs 2" },
                            ]}
                        />
                        <div style={{ marginTop: '8px' }}>
                            {textureUnlocked ? (
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
                            {t("common.save") || "Save"}
                        </Button>
                    </Form.Item>
                </Card>
            )}
            <ChangePasswordSection />
        </div>
    );
}
