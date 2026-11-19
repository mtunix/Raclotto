import React, { useState } from "react";
import { Card, Alert, Form, Input, Button, List, Space, Tag, message } from "antd";
import { CopyOutlined, CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { createInvite, revokeInvite, useListInvites } from "../../../api/generated/endpoints/invites/invites";
import type { InviteDto } from "../../../api/generated/model";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { ConfirmDeleteButton } from "../../../shared/ConfirmDeleteButton";
import { copyToClipboard } from "../copyToClipboard";
import "../SettingsView.css";

const iconButtonStyle: React.CSSProperties = {
    height: '44px',
    width: '44px',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px'
};

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const isExpired = (invite: InviteDto) => new Date(invite.expires_at) < new Date();

/** Invite someone by email and keep track of the invites you sent. */
export function InvitesSection() {
    const { t } = useTranslation();
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
            mutate();
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
            mutate();
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
                bodyStyle={{ padding: '24px' }}
                style={{ marginBottom: '24px' }}
            >
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError(null)}
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
                bodyStyle={{ padding: '24px' }}
            >
                <List
                    loading={isLoading}
                    dataSource={invites}
                    renderItem={(invite: InviteDto) => (
                        <List.Item
                            actions={[
                                <Space key="actions" size="small">
                                    <Button
                                        type="text"
                                        icon={<CopyOutlined />}
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
                                            danger={true}
                                            icon={<CloseOutlined />}
                                            style={iconButtonStyle}
                                        />
                                    )}
                                </Space>
                            ]}
                        >
                            <List.Item.Meta
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
                                            <strong>{t("invite.expiresAt")}:</strong> {formatDate(invite.expires_at)}
                                        </div>
                                        {invite.is_used && invite.used_at && (
                                            <div>
                                                <strong>{t("invite.usedAt")}:</strong> {formatDate(invite.used_at)}
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
}
