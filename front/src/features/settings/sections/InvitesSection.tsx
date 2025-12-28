import React from "react";
import { Card, Alert, Form, Input, Button, List, Space, Tag } from "antd";
import { CopyOutlined, CloseOutlined } from "@ant-design/icons";
import { ConfirmDeleteButton } from "../../../shared/components/ui/ConfirmDeleteButton";
import "../SettingsView.css";

interface InviteToken {
    id: number;
    token: string;
    email: string;
    expires_at: string;
    is_used: boolean;
    used_at: string | null;
}

interface InvitesSectionProps {
    t: (key: string) => string;
    inviteError: string | null;
    setInviteError: (v: string | null) => void;
    inviteLoading: boolean;
    loadingInvites: boolean;
    invites: InviteToken[];
    onInviteFinish: (values: { email: string }) => void | Promise<void>;
    handleCopyToken: (token: string) => void;
    handleRevoke: (id: number) => void;
    formatDate: (s: string) => string;
    isExpired: (expiresAt: string) => boolean;
}

export function InvitesSection(props: InvitesSectionProps) {
    const {
        t,
        inviteError,
        setInviteError,
        inviteLoading,
        loadingInvites,
        invites,
        onInviteFinish,
        handleCopyToken,
        handleRevoke,
        formatDate,
        isExpired,
    } = props;

    return (
        <div className="settings-session-tab">
            <Card 
                title={<span className="settings-section-title" style={{ fontSize: '20px' }}>{t("invite.generateToken")}</span>} 
                className="settings-card"
                bodyStyle={{ padding: '24px' }}
                style={{ marginBottom: '24px' }}
            >
                {inviteError && (
                    <Alert
                        message={inviteError}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setInviteError(null)}
                        style={{ marginBottom: 16, borderRadius: '12px' }}
                    />
                )}
                <Form
                    name="createInvite"
                    onFinish={onInviteFinish}
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
                            loading={inviteLoading}
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
                    loading={loadingInvites}
                    dataSource={invites}
                    renderItem={(invite: InviteToken) => (
                        <List.Item
                            actions={[
                                <Space key="actions" size="small">
                                    <Button
                                        type="text"
                                        icon={<CopyOutlined />}
                                        onClick={() => {
                                            const origin = window.location.origin;
                                            const registerUrl = `${origin}/register?token=${encodeURIComponent(invite.token)}`;
                                            handleCopyToken(registerUrl);
                                        }}
                                        size="large"
                                        style={{ 
                                            height: '44px',
                                            width: '44px',
                                            padding: '0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '12px'
                                        }}
                                    />
                                    {!invite.is_used && !isExpired(invite.expires_at) && (
                                        <ConfirmDeleteButton
                                            onConfirm={() => handleRevoke(invite.id)}
                                            danger={true}
                                            icon={<CloseOutlined />}
                                            style={{ 
                                                height: '44px',
                                                width: '44px',
                                                padding: '0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '12px'
                                            }}
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
                                        {!invite.is_used && isExpired(invite.expires_at) && (
                                            <Tag color="red">{t("invite.expired")}</Tag>
                                        )}
                                        {!invite.is_used && !isExpired(invite.expires_at) && (
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
