import React from "react";
import { Card, Form, Input, Button, Spin } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import "../SettingsView.css";

interface SessionSettingsSectionProps {
    t: (key: string) => string;
    sessionWaiting: boolean;
    sessionName: string;
    session: any;
    sessionSaving: boolean;
    exporting: boolean;
    sessionKey: string;
    onSessionNameChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSaveSessionName: () => void;
    onExportIngredients: () => void;
    setImportModalVisible: (visible: boolean) => void;
    onCloseSession: () => void;
}

export function SessionSettingsSection(props: SessionSettingsSectionProps) {
    const {
        t,
        sessionWaiting,
        sessionName,
        session,
        sessionSaving,
        exporting,
        sessionKey,
        onSessionNameChanged,
        onSaveSessionName,
        onExportIngredients,
        setImportModalVisible,
        onCloseSession,
    } = props;

    return (
        <div className="settings-session-tab">
            {sessionWaiting ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    <Card 
                        className="settings-card"
                        bodyStyle={{ padding: '24px' }}
                        style={{ marginBottom: '24px' }}
                    >
                        <Form.Item 
                            label={<span className="settings-section-title">{t("session.sessionName")}</span>} 
                            className="settings-form-item-spacing"
                            labelCol={{ span: 24 }}
                            wrapperCol={{ span: 24 }}
                        >
                            <Input
                                size="large"
                                value={sessionName}
                                onChange={onSessionNameChanged}
                                placeholder={t("common.enterName")}
                                onPressEnter={onSaveSessionName}
                                disabled={sessionWaiting || sessionSaving}
                            />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button 
                                type="primary" 
                                size="large"
                                onClick={onSaveSessionName} 
                                loading={sessionSaving}
                                disabled={!sessionName.trim() || sessionName === session?.name || sessionWaiting}
                                className="settings-save-button-medium"
                            >
                                {t("common.save") || "Save"}
                            </Button>
                        </Form.Item>
                    </Card>

                    {/* Import/Export Section */}
                    <Card 
                        style={{ 
                            borderRadius: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: 'none',
                            marginBottom: '24px'
                        }}
                        bodyStyle={{ padding: '24px' }}
                    >
                        {/* Export Section */}
                        <div style={{ marginBottom: '32px' }}>
                            <div className="settings-section-title" style={{ marginBottom: '8px' }}>
                                {t("settings.export") || "Export"}
                            </div>
                            <div style={{ fontSize: '15px', color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
                                {t("settings.exportDescription") || "View and copy all ingredients from this session as JSON."}
                            </div>
                            <Button 
                                size="large"
                                icon={<DownloadOutlined />}
                                onClick={onExportIngredients}
                                loading={exporting}
                                disabled={!sessionKey}
                                block
                                style={{ 
                                    height: '44px',
                                    fontSize: '17px',
                                    fontWeight: 500,
                                    borderRadius: '12px',
                                    letterSpacing: '-0.022em'
                                }}
                            >
                                {t("settings.export") || "Export"}
                            </Button>
                        </div>

                        {/* Import Section */}
                        <div style={{ marginBottom: 0 }}>
                            <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f', marginBottom: '8px' }}>
                                {t("settings.import") || "Import"}
                            </div>
                            <div style={{ fontSize: '15px', color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
                                {t("settings.importDescription") || "Import ingredients from JSON. You can review and edit them before importing."}
                            </div>
                            <Button 
                                size="large"
                                icon={<UploadOutlined />}
                                onClick={() => setImportModalVisible(true)}
                                disabled={!sessionKey}
                                block
                                style={{ 
                                    height: '44px',
                                    fontSize: '17px',
                                    fontWeight: 500,
                                    borderRadius: '12px',
                                    letterSpacing: '-0.022em'
                                }}
                            >
                                {t("settings.import") || "Import"}
                            </Button>
                        </div>
                    </Card>

                    <Card 
                        className="settings-card"
                        bodyStyle={{ padding: '24px' }}
                    >
                        <Form.Item 
                            label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>{t("session.eveningOver")}</span>} 
                            style={{ marginBottom: 0 }}
                            labelCol={{ span: 24 }}
                            wrapperCol={{ span: 24 }}
                        >
                            <Button 
                                type="primary" 
                                danger 
                                block 
                                size="large" 
                                onClick={onCloseSession}
                                style={{ 
                                    height: '44px',
                                    fontSize: '17px',
                                    fontWeight: 500,
                                    borderRadius: '12px',
                                    letterSpacing: '-0.022em'
                                }}
                            >
                                {t("session.endSession")}
                            </Button>
                        </Form.Item>
                    </Card>
                </>
            )}
        </div>
    );
}
