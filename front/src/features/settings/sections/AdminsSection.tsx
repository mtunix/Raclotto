import { useState } from "react";
import { Avatar, Card, List, Space, Switch, Tag, Typography, message } from "antd";
import { useTranslation } from "react-i18next";
import { updateUser, useListUsers } from "../../../api/generated/endpoints/users/users";
import type { UserAccountDto } from "../../../api/generated/model";
import { useAuthStore } from "../../../AuthSlice";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { getProfilePictureUrl } from "../../../lib/utils/profilePictureUrl";
import { canChangeAdmin } from "../../../model/permissions";
import "../SettingsView.css";

const { Text } = Typography;

/** Every user, with a switch for an admin to grant or revoke someone else's admin. */
export function AdminsSection() {
    const { t } = useTranslation();
    const me = useAuthStore((state) => state.user);
    const { data: users = [], isLoading, mutate } = useListUsers({
        swr: { onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true },
    });
    const [changing, setChanging] = useState<number | null>(null);

    async function onChange(user: UserAccountDto, isAdmin: boolean) {
        setChanging(user.id);
        try {
            const changed = await updateUser(user.id, { is_admin: isAdmin });
            await mutate(users.map((u) => (u.id === changed.id ? changed : u)), { revalidate: false });
            void message.success(t(isAdmin ? "settings.adminGranted" : "settings.adminRevoked", { name: user.name }));
        } catch {
            void message.error(t("settings.adminChangeFailed"));
        } finally {
            setChanging(null);
        }
    }

    return (
        <div className="settings-session-tab">
            <Card
                title={<span className="settings-section-title" style={{ fontSize: '20px' }}>{t("settings.adminRights")}</span>}
                className="settings-card"
                styles={{ body: { padding: '24px' } }}
            >
                <Text type="secondary" className="settings-help-text">{t("settings.adminsDescription")}</Text>
                <List
                    loading={isLoading}
                    dataSource={users}
                    rowKey="id"
                    renderItem={(user: UserAccountDto) => (
                        <List.Item
                            actions={[
                                <Switch
                                    key="admin"
                                    aria-label={user.name}
                                    checked={user.is_admin}
                                    disabled={!canChangeAdmin(me, user)}
                                    loading={changing === user.id}
                                    onChange={(checked) => void onChange(user, checked)}
                                />,
                            ]}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar src={getProfilePictureUrl(user.profile_picture)} style={{ backgroundColor: user.color }}>
                                        {user.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                }
                                title={
                                    <Space>
                                        <span>{user.name}</span>
                                        {user.is_admin && <Tag color="gold">{t("settings.admin")}</Tag>}
                                        {user.id === me?.id && <Tag>{t("settings.you")}</Tag>}
                                    </Space>
                                }
                                description={user.id === me?.id ? t("settings.ownAdminLocked") : undefined}
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
}
