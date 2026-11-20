import { useState } from "react";
import { Card, Alert, Button, Space, Tag, Typography, message } from "antd";
import { CopyOutlined, CloseOutlined, LinkOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { createInvite, revokeInvite, useListInvites } from "../../../api/generated/endpoints/invites/invites";
import type { InviteDto } from "../../../api/generated/model";
import { failureMessage } from "../../../lib/api/failedRequest";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { formatDateTime, useLanguage } from "../../../lib/language";
import { ConfirmDeleteButton } from "../../../shared/ConfirmDeleteButton";
import { ItemList, ItemMeta, ItemRow } from "../../../shared/ItemList/ItemList";
import { copyToClipboard } from "../../../shared/copyToClipboard";
import "../SettingsView.css";

const isExpired = (invite: InviteDto) => new Date(invite.expires_at) < new Date();
const registrationLink = (invite: InviteDto) =>
    `${window.location.origin}/register?token=${encodeURIComponent(invite.token)}`;

/** Make invite links for full accounts and keep track of them; guests at the table join by the session's link. */
export function InvitesSection() {
    const { t } = useTranslation();
    const language = useLanguage();
    const { data: invites = [], isLoading, mutate } = useListInvites({
        swr: { onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true },
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function onCreate() {
        setCreating(true);
        setError(null);
        void createInvite()
            .then(() => {
                void mutate();
                message.success(t("invite.tokenCreated"));
            })
            .catch((e: unknown) => {
                setError(failureMessage(e, t, t("invite.creationFailed")));
            })
            .finally(() => setCreating(false));
    }

    async function onRevoke(inviteId: number) {
        try {
            await revokeInvite(inviteId);
            void mutate();
            message.success(t("invite.tokenRevoked"));
        } catch (e) {
            setError(failureMessage(e, t, t("invite.revokeFailed")));
        }
    }

    return (
        <div className="settings-session-tab">
            <Card
                title={<span className="settings-section-title settings-card-title">{t("invite.generateToken")}</span>}
                className="settings-card mb-24"
                classNames={{ body: "settings-card-body" }}
            >
                {error && (
                    <Alert
                        title={error}
                        type="error"
                        showIcon
                        closable={{ onClose: () => setError(null) }}
                        className="settings-alert mb-16"
                    />
                )}
                <Typography.Paragraph type="secondary">{t("invite.explanation")}</Typography.Paragraph>
                <Button
                    type="primary"
                    size="large"
                    icon={<LinkOutlined />}
                    onClick={onCreate}
                    loading={creating}
                    className="settings-save-button-medium"
                >
                    {t("invite.generate")}
                </Button>
            </Card>

            <Card
                title={<span className="settings-section-title settings-card-title">{t("invite.myInvites")}</span>}
                className="settings-card"
                classNames={{ body: "settings-card-body" }}
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
                                        onClick={() => void copyToClipboard(registrationLink(invite), t)}
                                        size="large"
                                        className="settings-icon-button"
                                    />
                                    {!invite.is_used && !isExpired(invite) && (
                                        <ConfirmDeleteButton
                                            onConfirm={() => onRevoke(invite.id)}
                                            label={t("invite.revoke")}
                                            danger={true}
                                            icon={<CloseOutlined />}
                                            className="settings-icon-button"
                                        />
                                    )}
                                </Space>
                            }
                        >
                            <ItemMeta
                                title={
                                    <Space>
                                        <code>{invite.token}</code>
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
                                            <strong>{t("invite.createdAt")}:</strong> {formatDateTime(invite.created_at, language)}
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
