import React, {useEffect} from "react";
import {useParams, useNavigate, Outlet} from "react-router-dom";
import {useSessions} from "../lib/api/apiSession";
import {useAppStore} from "../AppSlice";
import {RaclottoSession} from "../model/raclottoSession";
import {SpinnerContainer} from "./common/Spinner";
import {Card, Button} from "antd";
import {useTranslation} from "react-i18next";

export function SessionLayout() {
    const {sessionId} = useParams<{sessionId: string}>();
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {data: sessions, isLoading, error} = useSessions();
    const storeSession = useAppStore((state) => state.session);
    const setSession = useAppStore((state) => state.setSession);

    useEffect(() => {
        if (!sessionId) {
            navigate("/");
            return;
        }

        // Compare as strings since server sends string IDs
        const sessionIdStr = String(sessionId);

        // If we already have the correct session in store, nothing to do
        if (storeSession && String(storeSession.id) === sessionIdStr) {
            return;
        }

        // If sessions have loaded, try to find and set the session
        if (sessions && sessions.length > 0) {
            const foundSession = sessions.find(s => String(s.id) === sessionIdStr);
            if (foundSession) {
                setSession(foundSession);
            }
        }
    }, [sessionId, sessions, navigate, setSession, storeSession]);

    // Validate sessionId format
    if (!sessionId) {
        return null;
    }

    const sessionIdStr = String(sessionId);

    // If we have a session in the store that matches, render immediately
    // This handles both: user just joined/created, and page refresh (if session was loaded)
    if (storeSession && String(storeSession.id) === sessionIdStr) {
        return <Outlet/>;
    }

    // If we're still loading sessions from API, show spinner
    // This handles the refresh case where store is empty and we need to load from API
    if (isLoading) {
        return <SpinnerContainer/>;
    }

    // If there was an error loading sessions
    if (error) {
        return (
            <Card>
                <p>{t("session.errorLoadingSession")}</p>
                <Button type="primary" onClick={() => navigate("/")}>
                    {t("session.backToSessions")}
                </Button>
            </Card>
        );
    }

    // Sessions have loaded - check if the session exists
    if (sessions !== undefined) {
        const foundSession = sessions.find(s => String(s.id) === sessionIdStr);
        if (foundSession) {
            // Session found in API
            // useEffect should have set it in store, but if store doesn't have it yet,
            // wait for the next render cycle (useEffect will set it and trigger re-render)
            if (!storeSession || String(storeSession.id) !== sessionIdStr) {
                // Session is being set by useEffect, wait for it
                return <SpinnerContainer/>;
            }
            // Store has the session, render
            return <Outlet/>;
        } else {
            // Session not found in API list
            return (
                <Card>
                    <p>{t("session.sessionNotFound")}</p>
                    <Button type="primary" onClick={() => navigate("/")}>
                        {t("session.backToSessions")}
                    </Button>
                </Card>
            );
        }
    }

    // Fallback: still waiting
    return <SpinnerContainer/>;
}
