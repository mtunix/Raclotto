import React from "react";
import {Button, Space} from "antd";
import {VectorGraphics} from "../lib/vectorGraphics";
import {Ingredient} from "../model/ingredient";
import {useTranslation} from "react-i18next";
import {useNavigate, useParams, useLocation} from "react-router-dom";
import {useAuthStore} from "../AuthSlice";
import {useAppStore} from "../AppSlice";

type ToolbarProps = {
    ingredients: Ingredient[];
    session: string;
    sessionId: string;
    sessionClosed: () => void;
    onAdd: () => void;
};

export function Toolbar(props: ToolbarProps) {
    let { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const paramsSessionId = useParams<{sessionId: string}>().sessionId;
    const sessionId = paramsSessionId || props.sessionId;
    const logout = useAuthStore((state) => state.logout);
    const clearSession = useAppStore((state) => state.clearSession);

    const routes: {[key: number]: string} = {
        0: `/${sessionId}/dashboard`,
        1: `/${sessionId}/generate`,
        2: `/${sessionId}/settings`,
        3: `/${sessionId}/history`,
        4: `/${sessionId}/add`,
        5: `/${sessionId}/achievements`,
        6: `/${sessionId}/server-settings`,
        7: `/${sessionId}/invites`,
    };

    function getActiveRoute(): number {
        const path = location.pathname;
        if (path.includes("/dashboard")) return 0;
        if (path.includes("/generate")) return 1;
        if (path.includes("/settings") && !path.includes("/server-settings")) return 2;
        if (path.includes("/history")) return 3;
        if (path.includes("/add")) return 4;
        if (path.includes("/achievements")) return 5;
        if (path.includes("/server-settings")) return 6;
        if (path.includes("/invites")) return 7;
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

    return (
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space wrap>
                <Button
                    type={activeRoute === 0 ? "primary" : "default"}
                    icon={VectorGraphics.DASHBOARD}
                    onClick={() => onToolbarClicked(0)}
                >
                    {t("common.dashboard")}
                </Button>
                <Button
                    type={activeRoute === 1 ? "primary" : "default"}
                    icon={VectorGraphics.SHUFFLE}
                    onClick={() => onToolbarClicked(1)}
                >
                    {t("common.shuffle")}
                </Button>
                <Button
                    type={activeRoute === 2 ? "primary" : "default"}
                    icon={VectorGraphics.SETTINGS_CLIENT}
                    onClick={() => onToolbarClicked(2)}
                >
                    {t("common.settings")}
                </Button>
                <Button
                    type={activeRoute === 3 ? "primary" : "default"}
                    icon={VectorGraphics.HISTORY}
                    onClick={() => onToolbarClicked(3)}
                >
                    {t("common.history")}
                </Button>
                <Button
                    type={activeRoute === 4 ? "primary" : "default"}
                    icon={VectorGraphics.ADD}
                    onClick={() => onToolbarClicked(4)}
                >
                    {t("common.addIngredient") || t("ingredient.ingredientName") || "Add Ingredient"}
                </Button>
                <Button
                    type={activeRoute === 5 ? "primary" : "default"}
                    icon={VectorGraphics.ACHIEVEMENTS}
                    onClick={() => onToolbarClicked(5)}
                >
                    {t("common.achievements")}
                </Button>
                <Button
                    type={activeRoute === 6 ? "primary" : "default"}
                    icon={VectorGraphics.SETTINGS_SERVER}
                    onClick={() => onToolbarClicked(6)}
                >
                    {t("common.serverSettings")}
                </Button>
                <Button
                    type={activeRoute === 7 ? "primary" : "default"}
                    icon={VectorGraphics.MAIL}
                    onClick={() => onToolbarClicked(7)}
                >
                    {t("common.invites")}
                </Button>
            </Space>
            <Button
                type="default"
                danger
                onClick={handleLogout}
            >
                {t("auth.logout")}
            </Button>
        </div>
    );
}

