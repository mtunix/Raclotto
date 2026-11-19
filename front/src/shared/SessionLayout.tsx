import { useEffect } from 'react';
import { Card, Button } from 'antd';
import { Outlet, useNavigate, useParams } from 'react-router';
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
            void navigate("/");
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
            <p>{status === "error" ? t("session.errorLoadingSession") : t("session.sessionNotFound")}</p>
            <Button type="primary" onClick={() => navigate("/")}>
                {t("session.backToSessions")}
            </Button>
        </Card>
    );
}
