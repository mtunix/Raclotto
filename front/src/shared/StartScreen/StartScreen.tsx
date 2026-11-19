import {Button, Form, Input, Select, Card, Row, Col, Space, Tag, message} from "antd";
import {SpinnerContainer} from "../Spinner/Spinner";
import ErrorPage from "../ErrorPage/ErrorPage";
import {
    createSession,
    reactivateSession,
    useListSessions,
} from "../../api/generated/endpoints/sessions/sessions";
import type {SessionDto} from "../../api/generated/model";
import {onErrorRetry} from "../../lib/api/swrHooks";
import { useState, useMemo, type ChangeEvent, useEffect } from "react";
import {useAppStore} from "../../AppSlice";
import {useNavigate} from "react-router";
import {useTranslation} from "react-i18next";
import {useAuthStore} from "../../AuthSlice";
import {canManageSession} from "../../model/permissions";

export function JoinSession() {
    const { t } = useTranslation();
    const setSession = useAppStore((state) => state.setSession);
    const navigate = useNavigate();
    const {data, isLoading, error, mutate} = useListSessions({include_inactive: true}, {swr: {onErrorRetry}});
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [reactivating, setReactivating] = useState(false);
    const user = useAuthStore((state) => state.user);

    // Sort sessions: active first, then inactive
    const sortedSessions = useMemo(() => {
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
                    const reactivatedSession = await reactivateSession({key: selectedSession.key});
                    setSession(reactivatedSession);
                    // Refresh the session list
                    void mutate();
                    message.success(t("session.reactivated"));
                    void navigate(`/${reactivatedSession.id}/generate`);
                } catch (error) {
                    console.error("Failed to reactivate session:", error);
                    message.error(t("session.reactivateFailed"));
                    setReactivating(false);
                    return;
                }
            } else {
                setSession(selectedSession);
                void navigate(`/${selectedSession.id}/generate`);
            }
        }
    }

    function onSessionSelected(value: number) {
        setSelectedIndex(value);
    }

    const [indexedSessions, setIndexedSessions] = useState(sortedSessions);
    if (indexedSessions !== sortedSessions) {
        setIndexedSessions(sortedSessions);
        if (sortedSessions.length > 0) setSelectedIndex(0);
    }

    if (isLoading) return <SpinnerContainer/>;
    if (error) return <ErrorPage/>;
    if (!sortedSessions || sortedSessions.length === 0) {
        return (
            <Card title={t("session.joinExisting")}>
                <p style={{ margin: 0, color: 'rgba(0, 0, 0, 0.45)' }}>{t("session.noSessionsAvailable")}</p>
            </Card>
        );
    }

    const selected: SessionDto | undefined = sortedSessions[selectedIndex];
    // A closed session only its creator or an admin can reopen; everyone else sees how it went.
    const recapOnly = selected !== undefined && !selected.active && !canManageSession(user, selected);

    return (
        <Card title={t("session.joinExisting")} style={{ height: '100%' }}>
            <Form layout="vertical">
                <Form.Item label={t("session.session")} style={{ marginBottom: 24 }}>
                    <Select 
                        value={selectedIndex} 
                        onChange={onSessionSelected}
                        style={{ width: '100%' }}
                        size="large"
                        options={sortedSessions.map((session: SessionDto, i: number) => ({
                            value: i,
                            label: session.active
                                ? session.name
                                : `${session.name} ${t("session.inactive")}`,
                        }))}
                    />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                    {selected && !selected.active && (
                        <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591' }}>
                            <Tag color="orange" style={{ marginBottom: '8px' }}>
                                {t("session.inactive")}
                            </Tag>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                                {recapOnly
                                    ? t("session.closedMessage")
                                    : t("session.reactivateMessage")}
                            </div>
                        </div>
                    )}
                    {recapOnly ? (
                        <Button type="primary" block size="large" onClick={() => navigate(`/recap/${encodeURIComponent(selected.key)}`)}>
                            {t("recap.show")}
                        </Button>
                    ) : (
                    <Button 
                        type="primary" 
                        onClick={join} 
                        disabled={!sortedSessions || sortedSessions.length === 0 || reactivating}
                        loading={reactivating}
                        block
                        size="large"
                    >
                        {reactivating 
                            ? t("session.reactivating")
                            : (selected && !selected.active
                                ? t("session.joinAndReactivate")
                                : t("session.join"))
                        }
                    </Button>
                    )}
                    {selected && !selected.active && !recapOnly && (
                        <Button type="link" block onClick={() => navigate(`/recap/${encodeURIComponent(selected.key)}`)}>
                            {t("recap.show")}
                        </Button>
                    )}
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

    function onNameChanged(e: ChangeEvent<HTMLInputElement>) {
        setSessionName(e.target.value);
    }

    function create() {
        if (sessionName.trim().length === 0) {
            return;
        }
        setIsCreating(true);
        createSession({name: sessionName.trim()}).then((session) => {
            setSession(session);
            setIsCreating(false);
            void navigate(`/${session.id}`);
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
            <Space style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}>
                <Button type="link" onClick={() => navigate("/rules")}>
                    {t("rules.newHere")}
                </Button>
            </Space>
        </div>
    );
}

export function StartScreen() {
    const session = useAppStore((state) => state.session);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    useEffect(() => {
        if (session) {
            void navigate(`/${session.id}`);
        }
    }, [session, navigate]);

    return (
        <div style={{margin: "0", padding: "40px 24px"}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, maxWidth: 1440, marginLeft: 'auto', marginRight: 'auto' }}>
                <h2 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.022em' }}>{t("session.welcome")} {user?.name}</h2>
                <Button size="large" onClick={() => { logout(); void navigate("/login"); }}>
                    {t("auth.logout")}
                </Button>
            </div>
            <SessionSelector/>
        </div>
    );
}
