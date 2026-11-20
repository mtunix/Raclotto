import { useEffect, useState } from "react";
import {Row, Col, Card, Alert, Button} from "antd";
import {onErrorRetry} from "../../lib/api/swrHooks";
import {useListIngredients} from "../../api/generated/endpoints/ingredients/ingredients";
import {Toolbar} from "../Toolbar/Toolbar";
import {EventDisplay} from "../EventDisplay/EventDisplay";
import {dismissSessionEvent, useSessionEvents} from "../EventDisplay/sessionEvents";
import {RulesIntroModal} from "../Rules/RulesIntroModal";
import {useAppStore} from "../../AppSlice";
import {useAuthStore} from "../../AuthSlice";
import {useNavigate, useParams, Outlet, useLocation} from "react-router";
import {useTranslation} from "react-i18next";
import "./MainScreen.css";


type MainScreenProps = {
    onSessionClosed?: () => void;
};

export function MainScreen(props: MainScreenProps) {
    const { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const navigate = useNavigate();
    const {sessionId} = useParams<{sessionId: string}>();
    const location = useLocation();

    const sessionKey = session?.key || "";
    const isGuest = useAuthStore((state) => state.user?.is_guest ?? false);
    const [guestNoticeClosed, setGuestNoticeClosed] = useState(false);
    
    // Use SWR hooks for data fetching
    const { data: ingredients = [] } = useListIngredients({session_key: sessionKey}, {
        swr: {enabled: !!sessionKey, onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true},
    });
    const { data: events = [] } = useSessionEvents(sessionKey);

    useEffect(() => {
        // Only redirect if we have both session and sessionId and they don't match
        // Don't redirect if session is still loading/being set
        // Give it a moment - SessionLayout should set the session
        if (session && sessionId && session.id.toString() !== sessionId) {
            // Session doesn't match URL - this shouldn't happen if SessionLayout is working
            // But give a small delay in case session is being updated
            const timeout = setTimeout(() => {
                if (session && session.id.toString() !== sessionId) {
            void navigate("/");
                }
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [session, sessionId, navigate]);

    const handleDismissEvent = (eventId: number) => {
        dismissSessionEvent(sessionKey, eventId).catch((error) => {
            console.error("Failed to dismiss event:", error);
        });
    };



    const removeWidthCap = useAppStore((state) => state.removeWidthCap);

    // Show loading state if session is not yet available
    // SessionLayout should have validated it, but it might still be loading from API on refresh
    if (!session) {
        // SessionLayout is responsible for loading the session
        // If we get here, it means SessionLayout rendered <Outlet/> but session isn't in store yet
        // This can happen briefly when session is being set in useEffect
        // Show a brief loading state
        return (
            <div className={removeWidthCap ? "main-screen-page main-screen-page-wide" : "main-screen-page"}>
                <Card>
                    <p>{t("session.loading")}</p>
                </Card>
            </div>
        );
    }

    return (
        <div className={removeWidthCap ? "main-screen-page main-screen-page-loaded main-screen-page-wide" : "main-screen-page main-screen-page-loaded"}>
            <RulesIntroModal/>
            <Row gutter={[0, 24]}>
                <Col span={24}>
                    <Toolbar
                        ingredients={ingredients}
                        session={sessionKey}
                        sessionId={sessionId || ""}
                        sessionClosed={props.onSessionClosed || (() => {})}
                        sessionName={session?.name}
                    />
                </Col>
            </Row>
            {/* It leads to the settings, where the account is kept. */}
            {isGuest && !guestNoticeClosed && !location.pathname.endsWith("/settings") && (
                <Alert
                    type="info"
                    showIcon
                    className="mb-16"
                    title={t("guest.notice")}
                    closable={{ onClose: () => setGuestNoticeClosed(true) }}
                    action={
                        <Button size="small" type="primary" onClick={() => navigate(`/${session.id}/settings`)}>
                            {t("guest.keepAccountButton")}
                        </Button>
                    }
                />
            )}
            <Row gutter={[0, 24]}>
                <Col span={24}>
                    <EventDisplay
                        events={events}
                        onDismiss={handleDismissEvent}
                    />
                </Col>
            </Row>
            <Row gutter={[0, 24]} className="mt-8">
                <Col span={24}>
                    {(() => {
                        const path = location.pathname;
                        
                        // Determine title based on route
                        let title: string | undefined;
                        if (path.includes("/generate")) {
                            title = t("toolbar.generateTitle");
                        } else if (path.includes("/settings")) {
                            title = t("toolbar.userSettingsTitle");
                        } else if (path.includes("/history")) {
                            title = t("toolbar.historyTitle");
                        } else if (path.includes("/add")) {
                            title = t("ingredient.ingredients");
                        } else if (path.includes("/achievements")) {
                            title = t("toolbar.achievementsTitle");
                        } else if (path.includes("/dashboard")) {
                            title = t("toolbar.dashboardTitle");
                        } else if (path.includes("/profile")) {
                            title = t("profile.title");
                        }
                        
                        // If there's a title, wrap the Outlet in a Card
                        if (title) {
                            return (
                                <Card
                                    title={<span className="page-title">{title}</span>}
                                >
                                    <Outlet/>
                                </Card>
                            );
                        }
                        
                        // Base route or no title - just render Outlet (which will be empty for base route)
                        return <Outlet/>;
                    })()}
                </Col>
            </Row>
        </div>
    );
}
