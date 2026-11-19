import { useState, type CSSProperties } from "react";
import { Card, Alert, Form, Input, Button, Space, Tag, message } from "antd";
import { CopyOutlined, CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { createInvite, revokeInvite, useListInvites } from "../../../api/generated/endpoints/invites/invites";
import type { InviteDto } from "../../../api/generated/model";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { formatDateTime, useLanguage } from "../../../lib/language";
import { ConfirmDeleteButton } from "../../../shared/ConfirmDeleteButton";
import { ItemList, ItemMeta, ItemRow } from "../../../shared/ItemList/ItemList";
import { copyToClipboard } from "../copyToClipboard";
import "../SettingsView.css";

const iconButtonStyle: CSSProperties = {
    height: '44px',
    width: '44px',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px'
};

const isExpired = (invite: InviteDto) => new Date(invite.expires_at) < new Date();

/** Invite someone by email and keep track of the invites you sent. */
export function InvitesSection() {
    const { t } = useTranslation();
    const language = useLanguage();
    const { data: invites = [], isLoading, mutate } = useListInvites({
        swr: { onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true },
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onCreate(values: { email: string }) {
        setCreating(true);
        setError(null);
        try {
            await createInvite({ email: values.email });
            void mutate();
            message.success(t("invite.tokenCreated"));
        } catch (e) {
            setError(e instanceof Error && e.message ? e.message : t("invite.creationFailed"));
        } finally {
            setCreating(false);
        }
    }

    async function onRevoke(inviteId: number) {
        try {
            await revokeInvite(inviteId);
            void mutate();
            message.success(t("invite.tokenRevoked"));
        } catch (e) {
            setError(e instanceof Error && e.message ? e.message : t("invite.revokeFailed"));
        }
    }

    return (
        <div className="settings-session-tab">
            <Card 
                title={<span className="settings-section-title" style={{ fontSize: '20px' }}>{t("invite.generateToken")}</span>} 
                className="settings-card"
                styles={{ body: { padding: '24px' } }}
                style={{ marginBottom: '24px' }}
            >
                {error && (
                    <Alert
                        title={error}
                        type="error"
                        showIcon
                        closable={{ onClose: () => setError(null) }}
                        style={{ marginBottom: 16, borderRadius: '12px' }}
                    />
                )}
                <Form
                    name="createInvite"
                    onFinish={onCreate}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label={<span className="settings-section-title">{t("invite.email")}</span>}
                        name="email"
                        rules={[
                            { required: true, message: t("invite.emailRequired") },
                            { type: 'email', message: t("invite.emailInvalid") }
                        ]}
                    >
                        <Input size="large" placeholder={t("invite.emailPlaceholder")} />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button 
                            type="primary" 
                            size="large" 
                            htmlType="submit" 
                            loading={creating}
                            className="settings-save-button-medium"
                        >
                            {t("invite.generate")}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            <Card 
                title={<span className="settings-section-title" style={{ fontSize: '20px' }}>{t("invite.myInvites")}</span>}
                className="settings-card"
                styles={{ body: { padding: '24px' } }}
            >
                <ItemList
                    loading={isLoading}
                    items={invites}
                    rowKey={(invite) => invite.id}
                    renderItem={(invite: InviteDto) => (
                        <ItemRow
                            actions={
                                <Space size="small">
                                    <Button
                                        type="text"
                                        icon={<CopyOutlined />}
                                        aria-label={t("settings.copyToClipboard")}
                                        onClick={() =>
                                            copyToClipboard(
                                                `${window.location.origin}/register?token=${encodeURIComponent(invite.token)}`,
                                                t,
                                            )
                                        }
                                        size="large"
                                        style={iconButtonStyle}
                                    />
                                    {!invite.is_used && !isExpired(invite) && (
                                        <ConfirmDeleteButton
                                            onConfirm={() => onRevoke(invite.id)}
                                            label={t("invite.revoke")}
                                            danger={true}
                                            icon={<CloseOutlined />}
                                            style={iconButtonStyle}
                                        />
                                    )}
                                </Space>
                            }
                        >
                            <ItemMeta
                                title={
                                    <Space>
                                        <span>{invite.email}</span>
                                        {invite.is_used && <Tag color="green">{t("invite.used")}</Tag>}
                                        {!invite.is_used && isExpired(invite) && (
                                            <Tag color="red">{t("invite.expired")}</Tag>
                                        )}
                                        {!invite.is_used && !isExpired(invite) && (
                                            <Tag color="blue">{t("invite.active")}</Tag>
                                        )}
                                    </Space>
                                }
                                description={
                                    <div>
                                        <div>
                                            <strong>{t("invite.token")}:</strong> <code>{invite.token}</code>
                                        </div>
                                        <div>
                                            <strong>{t("invite.expiresAt")}:</strong> {formatDateTime(invite.expires_at, language)}
                                        </div>
                                        {invite.is_used && invite.used_at && (
                                            <div>
                                                <strong>{t("invite.usedAt")}:</strong> {formatDateTime(invite.used_at, language)}
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        </ItemRow>
                    )}
                />
            </Card>
        </div>
    );
}
