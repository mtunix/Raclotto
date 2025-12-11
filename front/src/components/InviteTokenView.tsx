import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, List, Tag, Space, Alert, Popconfirm } from 'antd';
import { Api } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface InviteToken {
    id: number;
    token: string;
    email: string;
    expires_at: string;
    is_used: boolean;
    used_at: string | null;
}

export function InviteTokenView() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [invites, setInvites] = useState<InviteToken[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(true);

    const loadInvites = async () => {
        try {
            const data = await Api.listInvites();
            setInvites(data);
        } catch (err: any) {
            console.error("Failed to load invites:", err);
        } finally {
            setLoadingInvites(false);
        }
    };

    useEffect(() => {
        loadInvites();
    }, []);

    const onFinish = async (values: { email: string }) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await Api.createInvite(values.email);
            setSuccess(t("invite.tokenCreated"));
            loadInvites();
        } catch (err: any) {
            setError(err.message || t("invite.creationFailed"));
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (inviteId: number) => {
        try {
            await Api.revokeInvite(inviteId);
            setSuccess(t("invite.tokenRevoked"));
            loadInvites();
        } catch (err: any) {
            setError(err.message || t("invite.revokeFailed"));
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date();
    };

    return (
        <div>
            <Card title={t("invite.generateToken")} style={{ marginBottom: 16 }}>
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError(null)}
                        style={{ marginBottom: 16 }}
                    />
                )}
                {success && (
                    <Alert
                        message={success}
                        type="success"
                        showIcon
                        closable
                        onClose={() => setSuccess(null)}
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Form
                    name="createInvite"
                    onFinish={onFinish}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label={t("invite.email")}
                        name="email"
                        rules={[
                            { required: true, message: t("invite.emailRequired") },
                            { type: 'email', message: t("invite.emailInvalid") }
                        ]}
                    >
                        <Input placeholder={t("invite.emailPlaceholder")} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {t("invite.generate")}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            <Card title={t("invite.myInvites")}>
                <List
                    loading={loadingInvites}
                    dataSource={invites}
                    renderItem={(invite: InviteToken) => (
                        <List.Item
                            actions={[
                                !invite.is_used && !isExpired(invite.expires_at) ? (
                                    <Popconfirm
                                        title={t("invite.revokeConfirm")}
                                        onConfirm={() => handleRevoke(invite.id)}
                                        okText={t("common.yes")}
                                        cancelText={t("common.no")}
                                    >
                                        <Button danger size="small">
                                            {t("invite.revoke")}
                                        </Button>
                                    </Popconfirm>
                                ) : null
                            ].filter(Boolean)}
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
