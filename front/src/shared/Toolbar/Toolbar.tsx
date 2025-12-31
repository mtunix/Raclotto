import React from "react";
import { Button, Space, Row, Col, Flex, Typography, Avatar } from "antd";
import {
  DashboardOutlined,
  SwapOutlined,
  HistoryOutlined,
  PlusOutlined,
  TrophyOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Ingredient } from "../../model/ingredient";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuthStore } from "../../AuthSlice";
import { useAppStore } from "../../AppSlice";
import { useUserProfile } from "../../lib/api/swrHooks";
import { getProfilePictureUrl } from "../../lib/utils/profilePictureUrl";
import "./Toolbar.css";

// Import image from src directory
import raclotto from "../../raclotto-vibe.png";

const { Text } = Typography;

type ToolbarProps = {
  ingredients: Ingredient[];
  session: string;
  sessionId: string;
  sessionClosed: () => void;
  sessionName?: string;
};

export function Toolbar(props: ToolbarProps) {
  let { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const paramsSessionId = useParams<{ sessionId: string }>().sessionId;
  const sessionId = paramsSessionId || props.sessionId;
  const logout = useAuthStore((state) => state.logout);
  const clearSession = useAppStore((state) => state.clearSession);
  const session = useAppStore((state) => state.session);
  const sessionName = props.sessionName || session?.name || "";

  const currentUser = useAuthStore((state) => state.user);
  const { data: userProfile } = useUserProfile(currentUser?.id || 0);

  const profilePicture =
    userProfile?.profile_picture || currentUser?.profile_picture;
  const userName = currentUser?.name;

  const routes: { [key: number]: string } = {
    0: `/${sessionId}/dashboard`,
    1: `/${sessionId}/generate`,
    2: `/${sessionId}/settings`,
    3: `/${sessionId}/history`,
    4: `/${sessionId}/add`,
    5: `/${sessionId}/achievements`,
  };

  function getActiveRoute(): number {
    const path = location.pathname;
    if (path.includes("/dashboard")) return 0;
    if (path.includes("/generate")) return 1;
    if (path.includes("/settings")) return 2;
    if (path.includes("/history")) return 3;
    if (path.includes("/add")) return 4;
    if (path.includes("/achievements")) return 5;
    return -1;
  }

  function handleProfileClick() {
    const profileRoute = `/${sessionId}/profile${currentUser?.id ? `/${currentUser.id}` : ""}`;
    navigate(profileRoute);
  }

  function onToolbarClicked(id: number) {
    const route = routes[id];
    if (route) {
      // Only navigate if not already on this route
      // If already active, do nothing (don't deactivate)
      if (getActiveRoute() !== id) {
        navigate(route);
      }
    }
  }

  const activeRoute = getActiveRoute();

  function handleLogout() {
    logout();
    clearSession();
    navigate("/login");
  }

  function handleLeaveSession() {
    clearSession();
    navigate("/");
  }

  const buttonProps = [
    { id: 0, icon: <DashboardOutlined />, label: t("common.dashboard") },
    { id: 1, icon: <SwapOutlined />, label: t("common.shuffle") },
    { id: 3, icon: <HistoryOutlined />, label: t("common.history") },
    {
      id: 4,
      icon: <PlusOutlined />,
      label: t("ingredient.ingredients") || "Ingredients",
    },
    { id: 5, icon: <TrophyOutlined />, label: t("common.achievements") },
    { id: 2, icon: <SettingOutlined />, label: t("common.settings") },
  ];

  return (
    <Space
      direction="vertical"
      size="small"
      style={{ width: "100%", marginBottom: 0 }}
    >
      {/* Desktop: Session info above toolbar */}
      <Row align="middle" gutter={16} className="toolbar-session-row-desktop">
        <Col span={24}>
          <Flex align="center" gap="middle" style={{ width: "100%" }}>
            <img
              src={raclotto}
              alt="Raclotto"
              style={{ maxWidth: 180, height: "auto" }}
            />
            <Flex vertical gap={4}>
              <Space>
                <Text type="secondary">{t("session.session")}:</Text>
                <Text strong>{sessionName}</Text>
              </Space>
              <Button type="default" onClick={handleLeaveSession} size="small">
                ← {t("session.leave")}
              </Button>
            </Flex>
            <Avatar
              src={getProfilePictureUrl(profilePicture)}
              size={64}
              className="toolbar-profile-avatar"
              style={{
                marginLeft: "auto",
                cursor: "pointer",
                border: "2px solid #d9d9d9",
              }}
              onClick={handleProfileClick}
            >
              {!profilePicture && (
                <span className="toolbar-profile-avatar-text">
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </Avatar>
          </Flex>
        </Col>
      </Row>

      {/* Mobile: Logo, leave button, and session name */}
      <Flex
        className="toolbar-session-row-mobile"
        align="center"
        gap={8}
        style={{ marginBottom: 8, width: "100%" }}
      >
        <img
          src={raclotto}
          alt="Raclotto"
          className="toolbar-logo-mobile"
          style={{ flexShrink: 0 }}
        />
        <Flex vertical gap={4} align="flex-start" style={{ flex: 1 }}>
          <Space size="small">
            <Text strong style={{ fontSize: "0.9rem" }}>
              {sessionName}
            </Text>
          </Space>
          <Button type="default" onClick={handleLeaveSession} size="small">
            ← {t("session.leave")}
          </Button>
        </Flex>
        <Avatar
          src={getProfilePictureUrl(profilePicture)}
          size={64}
          className="toolbar-profile-avatar"
          style={{
            cursor: "pointer",
            border: "2px solid #d9d9d9",
            flexShrink: 0,
          }}
          onClick={handleProfileClick}
        >
          {!profilePicture && (
            <span style={{ fontSize: "20px" }}>
              {userName?.charAt(0)?.toUpperCase() || "U"}
            </span>
          )}
        </Avatar>
      </Flex>

      {/* Toolbar buttons row */}
      <Row>
        <Col span={24}>
          <Flex
            wrap="wrap"
            gap="small"
            justify="space-between"
            align="center"
            className="toolbar-buttons-container"
            style={{ width: "100%" }}
          >
            <Space wrap size={[8, 8]} className="toolbar-buttons-space">
              {buttonProps.map(({ id, icon, label }) => (
                <Button
                  key={id}
                  type={activeRoute === id ? "primary" : "default"}
                  icon={icon}
                  onClick={() => onToolbarClicked(id)}
                  className="toolbar-button"
                >
                  <span className="toolbar-button-label">{label}</span>
                </Button>
              ))}
            </Space>
            <Button
              type="default"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="toolbar-logout-button"
            >
              <span className="toolbar-button-label">{t("auth.logout")}</span>
            </Button>
          </Flex>
        </Col>
      </Row>
    </Space>
  );
}
