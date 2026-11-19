import type { CSSProperties, ReactNode } from "react";
import { Tabs } from "antd";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../AuthSlice";
import { canManageAdmins } from "../../model/permissions";
import { UserSettingsSection } from "./sections/UserSettingsSection";
import { SessionSettingsSection } from "./sections/SessionSettingsSection";
import { EventSettingsSection } from "./sections/EventSettingsSection";
import { InvitesSection } from "./sections/InvitesSection";
import { AdminsSection } from "./sections/AdminsSection";
import "./SettingsView.css";

const tabLabelStyle: CSSProperties = { fontSize: "17px", fontWeight: 500, letterSpacing: "-0.022em" };

export function SettingsView() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const tab = (key: string, label: string, children: ReactNode) => ({
    key,
    label: <span style={tabLabelStyle}>{label}</span>,
    children,
  });

  return (
    <Tabs
      defaultActiveKey="user"
      items={[
        tab("user", t("settings.userSettings") || "User Settings", <UserSettingsSection />),
        tab("session", t("settings.sessionSettings") || "Session Settings", <SessionSettingsSection />),
        tab("events", t("settings.eventSettings") || "Event Settings", <EventSettingsSection />),
        tab("invites", t("common.invites") || "Invites", <InvitesSection />),
        ...(canManageAdmins(user) ? [tab("admins", t("settings.admins"), <AdminsSection />)] : []),
      ]}
    />
  );
}
