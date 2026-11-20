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
import "./StartScreen.css";

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
                <p className="start-empty">{t("session.noSessionsAvailable")}</p>
            </Card>
        );
    }

    const selected: SessionDto | undefined = sortedSessions[selectedIndex];
    // A closed session only its creator or an admin can reopen; everyone else sees how it went.
    const recapOnly = selected !== undefined && !selected.active && !canManageSession(user, selected);

    return (
        <Card title={t("session.joinExisting")} className="start-card">
            <Form layout="vertical">
                <Form.Item label={t("session.session")} className="mb-24">
                    <Select 
                        value={selectedIndex} 
                        onChange={onSessionSelected}
                        className="full-width"
                        size="large"
                        options={sortedSessions.map((session: SessionDto, i: number) => ({
                            value: i,
                            label: session.active
                                ? session.name
                                : `${session.name} ${t("session.inactive")}`,
                        }))}
                    />
                </Form.Item>
                <Form.Item className="mb-0">
                    {selected && !selected.active && (
                        <div className="start-closed-notice">
                            <Tag color="orange" className="mb-8">
                                {t("session.inactive")}
                            </Tag>
                            <div className="start-closed-message">
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
        <div className="start-selector">
            <Row gutter={[32, 32]}>
                <Col xs={24} sm={24} md={12}>
                    <Card title={t("session.createNew")} className="start-card">
                        <Form layout="vertical">
                            <Form.Item label={t("session.sessionName")} className="mb-24">
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
                            <Form.Item className="mb-0">
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
            <Space className="start-rules-link">
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
        <div className="start-screen">
            <div className="start-header">
                <h2 className="start-welcome">{t("session.welcome")} {user?.name}</h2>
                <Button size="large" onClick={() => { logout(); void navigate("/login"); }}>
                    {t("auth.logout")}
                </Button>
            </div>
            <SessionSelector/>
        </div>
    );
}
