import React from "react";
import {Button, Space, Row, Col, Flex, Typography} from "antd";
import {VectorGraphics} from "../lib/vectorGraphics";
import {Ingredient} from "../model/ingredient";
import {useTranslation} from "react-i18next";
import {useNavigate, useParams, useLocation} from "react-router-dom";
import {useAuthStore} from "../AuthSlice";
import {useAppStore} from "../AppSlice";
import raclotto from "../raclotto-vibe.png";
import "./Toolbar.css";

const {Text} = Typography;

type ToolbarProps = {
    ingredients: Ingredient[];
    session: string;
    sessionId: string;
    sessionClosed: () => void;
    onAdd: () => void;
    sessionName?: string;
};

export function Toolbar(props: ToolbarProps) {
    let { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const paramsSessionId = useParams<{sessionId: string}>().sessionId;
    const sessionId = paramsSessionId || props.sessionId;
    const logout = useAuthStore((state) => state.logout);
    const clearSession = useAppStore((state) => state.clearSession);
    const session = useAppStore((state) => state.session);
    const sessionName = props.sessionName || session?.name || "";

    const routes: {[key: number]: string} = {
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

    function onToolbarClicked(id: number) {
        const route = routes[id];
        if (route) {
            if (getActiveRoute() === id) {
                // If already on this route, navigate to main session view
                navigate(`/${sessionId}`);
        } else {
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
        { id: 0, icon: VectorGraphics.DASHBOARD, label: t("common.dashboard") },
        { id: 1, icon: VectorGraphics.SHUFFLE, label: t("common.shuffle") },
        { id: 3, icon: VectorGraphics.HISTORY, label: t("common.history") },
        { id: 4, icon: VectorGraphics.ADD, label: t("common.addIngredient") || t("ingredient.ingredientName") || "Add Ingredient" },
        { id: 5, icon: VectorGraphics.ACHIEVEMENTS, label: t("common.achievements") },
        { id: 2, icon: VectorGraphics.SETTINGS_CLIENT, label: t("common.settings") },
    ];

    return (
        <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 0 }}>
            {/* Desktop: Session info above toolbar */}
            <Row align="middle" gutter={16} className="toolbar-session-row-desktop">
                <Col span={24}>
                    <Flex align="center" gap="middle" style={{ width: '100%' }}>
                        <img src={raclotto} alt="Raclotto" style={{ maxWidth: 180, height: 'auto' }} />
                        <Space>
                            <Text type="secondary">{t("session.session")}:</Text>
                            <Text strong>{sessionName}</Text>
                        </Space>
                        <Button 
                            type="default" 
                            onClick={handleLeaveSession}
                            style={{ marginLeft: 'auto' }}
                        >
                            ← {t("session.leave")}
                        </Button>
                    </Flex>
                </Col>
            </Row>

            {/* Mobile: Logo, leave button, and session name */}
            <Flex className="toolbar-session-row-mobile" align="center" gap={8} style={{ marginBottom: 8 }}>
                <img src={raclotto} alt="Raclotto" className="toolbar-logo-mobile" style={{ flexShrink: 0 }} />
                <Flex vertical gap={4} align="flex-start">
                    <Space size="small">
                        <Text strong style={{ fontSize: '0.9rem' }}>{sessionName}</Text>
                    </Space>
                    <Button 
                        type="default" 
                        onClick={handleLeaveSession}
                        size="small"
                    >
                        ← {t("session.leave")}
                    </Button>
                </Flex>
            </Flex>

            {/* Toolbar buttons row */}
            <Row>
                <Col span={24}>
                    <Flex wrap="wrap" gap="small" justify="space-between" align="center" className="toolbar-buttons-container" style={{ width: '100%' }}>
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
                            icon={VectorGraphics.LOGOUT}
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

