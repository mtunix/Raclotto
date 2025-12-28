import {Button, Form, Input, Select, Card, Row, Col, Tag, message} from "antd";
import {useSessions} from "../../../lib/api/apiSession";
import {SpinnerContainer} from "../../../shared/components/common/Spinner";
import ErrorPage from "../../../shared/components/common/error/ErrorPage";
import {Api} from "../../../lib/api";
import React, {useEffect, useState} from "react";
import {RaclottoSession} from "../../../model/raclottoSession";
import {useAppStore} from "../../../AppSlice";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuthStore} from "../../../AuthSlice";

export function JoinSession() {
    const { t } = useTranslation();
    const setSession = useAppStore((state) => state.setSession);
    const navigate = useNavigate();
    let {data, isLoading, error, mutate} = useSessions(true); // Include inactive sessions
    let [selectedIndex, setSelectedIndex] = React.useState(0);
    const [reactivating, setReactivating] = useState(false);

    // Sort sessions: active first, then inactive
    const sortedSessions = React.useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => {
            // Active sessions first (true comes before false)
            if (a.active && !b.active) return -1;
            if (!a.active && b.active) return 1;
            // If both have same active status, maintain original order
            return 0;
        });
    }, [data]);

    async function join() {
        if (sortedSessions && sortedSessions.length > 0 && selectedIndex >= 0 && selectedIndex < sortedSessions.length) {
            const selectedSession = sortedSessions[selectedIndex];
            
            // If session is inactive, reactivate it first
            if (!selectedSession.active) {
                setReactivating(true);
                try {
                    const reactivatedSession = await Api.reactivateSession(selectedSession.key);
                    setSession(reactivatedSession);
                    // Refresh the session list
                    mutate();
                    message.success(t("session.reactivated") || "Session reactivated successfully");
                    navigate(`/${reactivatedSession.id}/generate`);
                } catch (error) {
                    console.error("Failed to reactivate session:", error);
                    message.error(t("session.reactivateFailed") || "Failed to reactivate session");
                    setReactivating(false);
                    return;
                }
            } else {
                setSession(selectedSession);
                navigate(`/${selectedSession.id}/generate`);
            }
        }
    }

    function onSessionSelected(value: number) {
        setSelectedIndex(value);
    }

    useEffect(() => {
        if (sortedSessions && sortedSessions.length > 0) {
            setSelectedIndex(0);
        }
    }, [sortedSessions]);

    if (isLoading) return <SpinnerContainer/>;
    if (error) return <ErrorPage error={error}/>;
    if (!sortedSessions || sortedSessions.length === 0) {
        return (
            <Card title={t("session.joinExisting")}>
                <p style={{ margin: 0, color: 'rgba(0, 0, 0, 0.45)' }}>{t("session.noSessionsAvailable")}</p>
            </Card>
        );
    }

    return (
        <Card title={t("session.joinExisting")} style={{ height: '100%' }}>
            <Form layout="vertical">
                <Form.Item label={t("session.session")} style={{ marginBottom: 24 }}>
                    <Select 
                        value={selectedIndex} 
                        onChange={onSessionSelected}
                        style={{ width: '100%' }}
                        size="large"
                    >
                        {sortedSessions.map((session: RaclottoSession, i: number) => {
                            const displayName = session.active 
                                ? session.name 
                                : `${session.name} ${t("session.inactive") || "(Inactive)"}`;
                            return (
                                <Select.Option key={session.id} value={i}>
                                    {displayName}
                                </Select.Option>
                            );
                        })}
                    </Select>
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                    {sortedSessions && sortedSessions.length > 0 && selectedIndex >= 0 && selectedIndex < sortedSessions.length && !sortedSessions[selectedIndex].active && (
                        <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591' }}>
                            <Tag color="orange" style={{ marginBottom: '8px' }}>
                                {t("session.inactive") || "Inactive"}
                            </Tag>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                                {t("session.reactivateMessage") || "This session is inactive. It will be reactivated when you join."}
                            </div>
                        </div>
                    )}
                    <Button 
                        type="primary" 
                        onClick={join} 
                        disabled={!sortedSessions || sortedSessions.length === 0 || reactivating}
                        loading={reactivating}
                        block
                        size="large"
                    >
                        {reactivating 
                            ? (t("session.reactivating") || "Reactivating...")
                            : (sortedSessions && sortedSessions.length > 0 && selectedIndex >= 0 && selectedIndex < sortedSessions.length && !sortedSessions[selectedIndex].active
                                ? (t("session.joinAndReactivate") || "Join & Reactivate")
                                : (t("session.join") || "Join"))
                        }
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
}

export function SessionSelector() {
    const { t } = useTranslation();
    const setSession = useAppStore((state) => state.setSession);
    const navigate = useNavigate();
    const [sessionName, setSessionName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    function onNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setSessionName(e.target.value);
    }

    function create() {
        if (sessionName.trim().length === 0) {
            return;
        }
        setIsCreating(true);
        Api.createSession(sessionName.trim()).then((session) => {
            setSession(session);
            setIsCreating(false);
            navigate(`/${session.id}`);
        }).catch((error) => {
            console.error("Failed to create session:", error);
            setIsCreating(false);
        });
    }

    return (
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 24px' }}>
            <Row gutter={[32, 32]}>
                <Col xs={24} sm={24} md={12}>
                    <Card title={t("session.createNew")} style={{ height: '100%' }}>
                        <Form layout="vertical">
                            <Form.Item label={t("session.sessionName")} style={{ marginBottom: 24 }}>
                                <Input
                                    type="text"
                                    placeholder={t("session.sessionNamePlaceholder")}
                                    value={sessionName}
                                    onChange={onNameChanged}
                                    disabled={isCreating}
                                    size="large"
                                    onPressEnter={create}
                                />
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button 
                                    type="primary" 
                                    onClick={create}
                                    disabled={sessionName.trim().length === 0 || isCreating}
                                    block
                                    size="large"
                                    loading={isCreating}
                                >
                                    {isCreating ? t("session.creating") : t("common.create")}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
                <Col xs={24} sm={24} md={12}>
                    <JoinSession/>
                </Col>
            </Row>
        </div>
    );
}

export function StartScreen() {
    const session = useAppStore((state) => state.session);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    React.useEffect(() => {
        if (session) {
            navigate(`/${session.id}`);
        }
    }, [session, navigate]);

    return (
        <div style={{margin: "0", padding: "40px 24px"}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, maxWidth: 1440, marginLeft: 'auto', marginRight: 'auto' }}>
                <h2 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.022em' }}>{t("session.welcome")} {user?.name}</h2>
                <Button size="large" onClick={() => { logout(); navigate("/login"); }}>
                    {t("auth.logout")}
                </Button>
            </div>
            <SessionSelector/>
        </div>
    );
}
