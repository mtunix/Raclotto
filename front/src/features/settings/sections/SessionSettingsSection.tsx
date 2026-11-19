import { useState } from "react";
import { Alert, Button, Card, Form, Input, message, Modal, Spin } from "antd";
import { BarChartOutlined, BgColorsOutlined, CopyOutlined, UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
    closeSession,
    updateSession,
    useGetSessionByKey,
} from "../../../api/generated/endpoints/sessions/sessions";
import { useAppStore } from "../../../AppSlice";
import { useAuthStore } from "../../../AuthSlice";
import { mutateSession, onErrorRetry } from "../../../lib/api/swrHooks";
import { canManageSession } from "../../../model/permissions";
import { copyToClipboard } from "../copyToClipboard";
import { INGREDIENT_PROMPT } from "../ingredientPrompt";
import { ExportIngredientsButton } from "./ExportIngredientsButton";
import { ImportIngredientsModal } from "./ImportIngredientsModal";
import { descriptionStyle, wideButtonStyle } from "./sessionSettingsStyles";
import "../SettingsView.css";

/** The current session: its name, its ingredient catalog as a file, its recap and its end. */
export function SessionSettingsSection() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const session = useAppStore((state) => state.session);
    const setSession = useAppStore((state) => state.setSession);
    const clearSession = useAppStore((state) => state.clearSession);
    const user = useAuthStore((state) => state.user);
    const sessionKey = session?.key ?? "";
    const { data: stored, isLoading } = useGetSessionByKey(
        { session_key: sessionKey },
        { swr: { enabled: !!sessionKey, onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true } },
    );
    const canManage = canManageSession(user, stored ?? session);

    const [name, setName] = useState("");
    const [savingName, setSavingName] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [promptOpen, setPromptOpen] = useState(false);
    const [confirmingEnd, setConfirmingEnd] = useState(false);

    const [namedFrom, setNamedFrom] = useState<typeof stored>(undefined);
    if (stored && stored !== namedFrom) {
        setNamedFrom(stored);
        setName(stored.name);
    }

    function saveName() {
        if (!session || !name.trim()) return;
        setSavingName(true);
        void updateSession(session.id, { name: name.trim() })
            .then((renamed) => {
                setSession(renamed);
                void mutateSession(sessionKey);
                message.success(t("common.saved"));
            })
            .catch((e: unknown) => {
                console.error("Failed to update session:", e);
                message.error(t("common.saveFailed"));
            })
            .finally(() => setSavingName(false));
    }

    async function endSession() {
        try {
            await closeSession({ key: sessionKey });
            setConfirmingEnd(false);
            clearSession();
            void navigate(`/recap/${encodeURIComponent(sessionKey)}`);
        } catch (e) {
            console.error("Failed to close session:", e);
            message.error(t("session.closeFailed"));
        }
    }

    if (isLoading) {
        return (
            <div className="settings-session-tab" style={{ display: "flex", justifyContent: "center", minHeight: "200px" }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="settings-session-tab">
            {!canManage && (
                <Alert
                    type="info"
                    showIcon
                    title={t("settings.onlyCreatorManages")}
                    style={{ marginBottom: 24 }}
                />
            )}

            <Card className="settings-card" styles={{ body: { padding: "24px" } }} style={{ marginBottom: "24px" }}>
                <Form.Item
                    label={<span className="settings-section-title">{t("session.sessionName")}</span>}
                    className="settings-form-item-spacing"
                    labelCol={{ span: 24 }}
                    wrapperCol={{ span: 24 }}
                >
                    <Input
                        size="large"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("common.enterName")}
                        onPressEnter={saveName}
                        disabled={!canManage || savingName}
                    />
                </Form.Item>
                {canManage && (
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            size="large"
                            onClick={saveName}
                            loading={savingName}
                            disabled={!name.trim() || name === stored?.name}
                            className="settings-save-button-medium"
                        >
                            {t("common.save")}
                        </Button>
                    </Form.Item>
                )}
            </Card>

            <Card className="settings-card" styles={{ body: { padding: "24px" } }} style={{ marginBottom: "24px" }}>
                <div style={{ marginBottom: "32px" }}>
                    <div className="settings-section-title" style={{ marginBottom: "8px" }}>
                        {t("settings.prompt")}
                    </div>
                    <div style={descriptionStyle}>
                        {t("settings.promptDescription")}
                    </div>
                    <Button size="large" icon={<BgColorsOutlined />} onClick={() => setPromptOpen(true)} block style={wideButtonStyle}>
                        {t("settings.viewPrompt")}
                    </Button>
                </div>

                <div style={{ marginBottom: "32px" }}>
                    <div className="settings-section-title" style={{ marginBottom: "8px" }}>
                        {t("settings.export")}
                    </div>
                    <div style={descriptionStyle}>
                        {t("settings.exportDescription")}
                    </div>
                    <ExportIngredientsButton sessionKey={sessionKey} />
                </div>

                <div>
                    <div className="settings-section-title" style={{ marginBottom: "8px" }}>
                        {t("settings.import")}
                    </div>
                    <div style={descriptionStyle}>
                        {t("settings.importDescription")}
                    </div>
                    <Button
                        size="large"
                        icon={<UploadOutlined />}
                        onClick={() => setImportOpen(true)}
                        disabled={!sessionKey}
                        block
                        style={wideButtonStyle}
                    >
                        {t("settings.import")}
                    </Button>
                </div>
            </Card>

            <Card className="settings-card" styles={{ body: { padding: "24px" } }} style={{ marginBottom: "24px" }}>
                <div className="settings-section-title" style={{ marginBottom: "8px" }}>
                    {t("recap.title")}
                </div>
                <div style={descriptionStyle}>{t("recap.description")}</div>
                <Button
                    size="large"
                    icon={<BarChartOutlined />}
                    onClick={() => navigate(`/recap/${encodeURIComponent(sessionKey)}`)}
                    disabled={!sessionKey}
                    block
                    style={wideButtonStyle}
                >
                    {t("recap.show")}
                </Button>
            </Card>

            {canManage && (
                <Card className="settings-card" styles={{ body: { padding: "24px" } }}>
                    <div className="settings-section-title" style={{ marginBottom: "16px" }}>
                        {t("session.eveningOver")}
                    </div>
                    <Button type="primary" danger block size="large" onClick={() => setConfirmingEnd(true)} style={wideButtonStyle}>
                        {t("session.endSession")}
                    </Button>
                </Card>
            )}

            <ImportIngredientsModal open={importOpen} sessionKey={sessionKey} onClose={() => setImportOpen(false)} />

            <Modal
                title={t("session.confirmCloseTitle")}
                open={confirmingEnd}
                onCancel={() => setConfirmingEnd(false)}
                footer={[
                    <Button key="cancel" onClick={() => setConfirmingEnd(false)}>
                        {t("common.cancel")}
                    </Button>,
                    <Button key="confirm" type="primary" danger onClick={endSession}>
                        {t("session.endSession")}
                    </Button>,
                ]}
            >
                <p>{t("session.confirmCloseMessage")}</p>
            </Modal>

            <Modal
                title={t("settings.llmPrompt")}
                open={promptOpen}
                onCancel={() => setPromptOpen(false)}
                footer={[
                    <Button key="copy" icon={<CopyOutlined />} onClick={() => copyToClipboard(INGREDIENT_PROMPT, t)} style={{ width: "100%" }}>
                        {t("settings.copyPrompt")}
                    </Button>,
                    <Button key="close" onClick={() => setPromptOpen(false)} style={{ width: "100%", marginTop: "8px" }}>
                        {t("auth.close")}
                    </Button>,
                ]}
                width={700}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                        {t("settings.promptModalDescription")}
                    </div>
                    <Input.TextArea
                        value={INGREDIENT_PROMPT}
                        readOnly
                        rows={20}
                        style={{ fontFamily: "monospace", fontSize: "12px", backgroundColor: "#f5f5f5" }}
                    />
                </div>
            </Modal>
        </div>
    );
}
