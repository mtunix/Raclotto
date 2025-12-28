import React, {useCallback, useEffect} from "react";
import {Row, Col, Card} from "antd";
import {Api} from "../../../lib/api";
import {useIngredients, useEvents, mutateEvents} from "../../../lib/api/swrHooks";
import {Toolbar} from "./Toolbar";
import {EventDisplay} from "../../../shared/components/common/EventDisplay";
import {useAppStore} from "../../../AppSlice";
import {useSearchParams, useNavigate, useParams, Outlet, useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import "../MainScreen.css";


type MainScreenProps = {
    onSessionClosed?: () => void;
};

export function MainScreen(props: MainScreenProps) {
    const { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const navigate = useNavigate();
    const {sessionId} = useParams<{sessionId: string}>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const popout = searchParams.get("popout") === "true";

    const sessionKey = session?.key || "";
    
    // Use SWR hooks for data fetching
    const { data: ingredients = [] } = useIngredients(sessionKey);
    const { data: events = [] } = useEvents(sessionKey);

    useEffect(() => {
        // Only redirect if we have both session and sessionId and they don't match
        // Don't redirect if session is still loading/being set
        // Give it a moment - SessionLayout should set the session
        if (session && sessionId && session.id.toString() !== sessionId) {
            // Session doesn't match URL - this shouldn't happen if SessionLayout is working
            // But give a small delay in case session is being updated
            const timeout = setTimeout(() => {
                if (session && session.id.toString() !== sessionId) {
            navigate("/");
                }
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [session, sessionId, navigate]);

    const handleDismissEvent = useCallback((eventId: number) => {
        Api.dismissEvent(eventId).then(() => {
            // Invalidate events cache to refresh
            mutateEvents(sessionKey);
        }).catch((error) => {
            console.error("Failed to dismiss event:", error);
        });
    }, [sessionKey]);



    const removeWidthCap = useAppStore((state) => state.removeWidthCap);

    // Show loading state if session is not yet available
    // SessionLayout should have validated it, but it might still be loading from API on refresh
    if (!session) {
        // SessionLayout is responsible for loading the session
        // If we get here, it means SessionLayout rendered <Outlet/> but session isn't in store yet
        // This can happen briefly when session is being set in useEffect
        // Show a brief loading state
        return (
            <div style={{margin: "0", padding: "40px 24px", maxWidth: removeWidthCap ? 'none' : 1440, marginLeft: 'auto', marginRight: 'auto'}}>
                <Card>
                    <p>{t("session.loading") || "Loading session..."}</p>
                </Card>
            </div>
        );
    }

    return (
        <div style={{margin: "0", padding: "40px 24px", paddingBottom: '48px', maxWidth: removeWidthCap ? 'none' : 1440, marginLeft: 'auto', marginRight: 'auto'}}>
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
            <Row gutter={[0, 24]}>
                <Col span={24}>
                    <EventDisplay
                        events={events}
                        onDismiss={handleDismissEvent}
                    />
                </Col>
            </Row>
            <Row gutter={[0, 24]} style={{ marginTop: '8px' }}>
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
                            title = t("ingredient.ingredients") || "Ingredients";
                        } else if (path.includes("/achievements")) {
                            title = t("toolbar.achievementsTitle");
                        } else if (path.includes("/dashboard")) {
                            title = t("toolbar.dashboardTitle") || "Dashboard";
                        } else if (path.includes("/profile")) {
                            title = t("profile.title") || "Profile";
                        }
                        
                        // If there's a title, wrap the Outlet in a Card
                        if (title) {
                            return (
                                <Card
                                    title={<span style={{ fontWeight: 600, fontSize: '24px', letterSpacing: '-0.022em' }}>{title}</span>}
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
