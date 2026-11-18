import React, { useEffect } from 'react';
import { Card, Button } from 'antd';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SpinnerContainer } from './Spinner/Spinner';
import { useRouteSession } from './useRouteSession';

export function SessionLayout() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const {t} = useTranslation();
    const status = useRouteSession(sessionId);

    useEffect(() => {
        if (!sessionId) {
            navigate("/");
        }
    }, [sessionId, navigate]);

    if (!sessionId) {
        return null;
    }

    if (status === "ready") {
        return <Outlet/>;
    }

    if (status === "loading") {
        return <SpinnerContainer/>;
    }

    return (
        <Card>
            <p>{t(status === "error" ? "session.errorLoadingSession" : "session.sessionNotFound")}</p>
            <Button type="primary" onClick={() => navigate("/")}>
                {t("session.backToSessions")}
            </Button>
        </Card>
    );
}
