import type { ReactNode } from "react";
import { Tabs } from "antd";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../AuthSlice";
import { canInvite, canManageAdmins } from "../../model/permissions";
import { UserSettingsSection } from "./sections/UserSettingsSection";
import { SessionSettingsSection } from "./sections/SessionSettingsSection";
import { EventSettingsSection } from "./sections/EventSettingsSection";
import { InvitesSection } from "./sections/InvitesSection";
import { AdminsSection } from "./sections/AdminsSection";
import "./SettingsView.css";

export function SettingsView() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const tab = (key: string, label: string, children: ReactNode) => ({
    key,
    label: <span className="settings-tab-label">{label}</span>,
    children,
  });

  return (
    <Tabs
      defaultActiveKey="user"
      items={[
        tab("user", t("settings.userSettings"), <UserSettingsSection />),
        tab("session", t("settings.sessionSettings"), <SessionSettingsSection />),
        tab("events", t("settings.eventSettings"), <EventSettingsSection />),
        ...(canInvite(user) ? [tab("invites", t("common.invites"), <InvitesSection />)] : []),
        ...(canManageAdmins(user) ? [tab("admins", t("settings.admins"), <AdminsSection />)] : []),
      ]}
    />
  );
}
