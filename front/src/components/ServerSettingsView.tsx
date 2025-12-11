import React, {useState, useEffect} from "react";
import {Form, Input, Button, Spin, message, Upload, Space} from "antd";
import {UploadOutlined, DownloadOutlined} from "@ant-design/icons";
import {Api} from "../lib/api";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {useAppStore} from "../AppSlice";

export function ServerSettingsView() {
    let { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const navigate = useNavigate();
    const clearSession = useAppStore((state) => state.clearSession);
    const setSession = useAppStore((state) => state.setSession);
    const triggerSettingsRefresh = useAppStore((state) => state.triggerSettingsRefresh);
    let [name, setName] = useState("");
    let [waiting, setWaiting] = useState(true);
    let [saving, setSaving] = useState(false);
    let [exporting, setExporting] = useState(false);
    let [importing, setImporting] = useState(false);
    let [reimporting, setReimporting] = useState(false);

    useEffect(() => {
        if (!sessionKey) return;
        Api.getSessionByKey(sessionKey).then((sessionData) => {
            setName(sessionData.name);
            setWaiting(false);
        }).catch((error) => {
            console.error("Failed to load session:", error);
            setWaiting(false);
        });
    }, [sessionKey]);

    function onNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setName(e.target.value);
    }

    function onSaveName() {
        if (!session || !name.trim()) return;
        setSaving(true);
        Api.updateSession(session.id, name.trim()).then((updatedSession) => {
            setSession(updatedSession);
            message.success(t("common.saved") || "Saved");
            setSaving(false);
        }).catch((error) => {
            console.error("Failed to update session:", error);
            message.error(t("common.saveFailed") || "Failed to save");
            setSaving(false);
        });
    }

    function onCloseSession() {
        if (!sessionKey) return;
        Api.close(sessionKey).then(() => {
            clearSession();
            navigate("/");
        }).catch((error) => {
            console.error("Failed to close session:", error);
        });
    }

    // Import/Export functions
    function onExportIngredients() {
        if (!sessionKey) {
            message.error(t("settings.noSession") || "No session selected");
            return;
        }
        setExporting(true);
        Api.exportIngredients(sessionKey).then((data) => {
            // Create a blob and download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ingredients-${sessionKey}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            message.success(t("settings.exportSuccess") || "Ingredients exported successfully");
            setExporting(false);
        }).catch((error) => {
            console.error("Failed to export ingredients:", error);
            message.error(t("settings.exportFailed") || "Failed to export ingredients");
            setExporting(false);
        });
    }

    function onImportIngredients(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!sessionKey) {
                reject(new Error(t("settings.noSession") || "No session selected"));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const data = JSON.parse(text);
                    if (!data.ingredients || !Array.isArray(data.ingredients)) {
                        reject(new Error(t("settings.invalidFileFormat") || "Invalid file format. Expected an object with an 'ingredients' array."));
                        return;
                    }
                    setImporting(true);
                    Api.importIngredients(sessionKey, data.ingredients).then((result) => {
                        message.success(t("settings.importSuccess", { count: result.created }) || `Successfully imported ${result.created} ingredients`);
                        triggerSettingsRefresh();
                        setImporting(false);
                        resolve();
                    }).catch((error) => {
                        console.error("Failed to import ingredients:", error);
                        message.error(t("settings.importFailed") || "Failed to import ingredients");
                        setImporting(false);
                        reject(error);
                    });
                } catch (error) {
                    reject(new Error(t("settings.invalidJson") || "Invalid JSON file"));
                }
            };
            reader.onerror = () => reject(new Error(t("settings.fileReadError") || "Failed to read file"));
            reader.readAsText(file);
        });
    }

    function onReimportIngredients(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!sessionKey) {
                reject(new Error(t("settings.noSession") || "No session selected"));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const data = JSON.parse(text);
                    if (!data.ingredients || !Array.isArray(data.ingredients)) {
                        reject(new Error(t("settings.invalidFileFormat") || "Invalid file format. Expected an object with an 'ingredients' array."));
                        return;
                    }
                    setReimporting(true);
                    Api.reimportIngredients(sessionKey, data.ingredients).then((result) => {
                        message.success(
                            t("settings.reimportSuccess", {
                                created: result.created,
                                updated: result.updated,
                                deleted: result.deleted
                            }) || `Reimported: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`
                        );
                        triggerSettingsRefresh();
                        setReimporting(false);
                        resolve();
                    }).catch((error) => {
                        console.error("Failed to reimport ingredients:", error);
                        message.error(t("settings.reimportFailed") || "Failed to reimport ingredients");
                        setReimporting(false);
                        reject(error);
                    });
                } catch (error) {
                    reject(new Error(t("settings.invalidJson") || "Invalid JSON file"));
                }
            };
            reader.onerror = () => reject(new Error(t("settings.fileReadError") || "Failed to read file"));
            reader.readAsText(file);
        });
    }

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            <Form.Item label={t("session.sessionName")}>
                <Input
                    value={name}
                    onChange={onNameChanged}
                    placeholder={t("common.enterName")}
                    onPressEnter={onSaveName}
                    disabled={waiting || saving}
                />
            </Form.Item>
            <Form.Item>
                <Button 
                    type="primary" 
                    onClick={onSaveName} 
                    loading={saving}
                    disabled={!name.trim() || name === session?.name || waiting}
                    style={{ marginBottom: '8px' }}
                >
                    {t("common.save") || "Save"}
                </Button>
            </Form.Item>

            {/* Import/Export Section */}
            <Form.Item label={t("settings.ingredientManagement") || "Ingredient Management"}>
                <Space wrap>
                    <Button 
                        icon={<DownloadOutlined />}
                        onClick={onExportIngredients}
                        loading={exporting}
                        disabled={!sessionKey}
                    >
                        {t("settings.exportIngredients") || "Export Ingredients"}
                    </Button>
                    <Upload
                        accept=".json"
                        showUploadList={false}
                        beforeUpload={(file) => {
                            onImportIngredients(file).catch((error) => {
                                message.error(error.message || t("settings.importFailed") || "Failed to import");
                            });
                            return false; // Prevent auto upload
                        }}
                        disabled={!sessionKey || importing}
                    >
                        <Button 
                            icon={<UploadOutlined />}
                            loading={importing}
                            disabled={!sessionKey || importing}
                        >
                            {t("settings.importIngredients") || "Import Ingredients (New)"}
                        </Button>
                    </Upload>
                    <Upload
                        accept=".json"
                        showUploadList={false}
                        beforeUpload={(file) => {
                            onReimportIngredients(file).catch((error) => {
                                message.error(error.message || t("settings.reimportFailed") || "Failed to reimport");
                            });
                            return false; // Prevent auto upload
                        }}
                        disabled={!sessionKey || reimporting}
                    >
                        <Button 
                            icon={<UploadOutlined />}
                            loading={reimporting}
                            disabled={!sessionKey || reimporting}
                        >
                            {t("settings.reimportIngredients") || "Reimport Ingredients (Update/Delete)"}
                        </Button>
                    </Upload>
                </Space>
            </Form.Item>

            <Form.Item label={t("session.eveningOver")}>
                <Button type="primary" danger block onClick={onCloseSession} style={{ marginTop: '8px' }}>
                    {t("session.endSession")}
                </Button>
            </Form.Item>
        </div>
    );
}
