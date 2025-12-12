import React, {useState, useEffect} from "react";
import {Form, Input, Switch, Space, message, Spin, Button, Upload, Tabs, Card, List, Tag, Alert, Popconfirm, ColorPicker} from "antd";
import {UploadOutlined, DownloadOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {Api} from "../lib/api";
import {useAppStore} from "../AppSlice";
import {useAuthStore} from "../AuthSlice";
import {EventConfigView} from "./EventConfigView";

type SettingsViewProps = {};

interface InviteToken {
    id: number;
    token: string;
    email: string;
    expires_at: string;
    is_used: boolean;
    used_at: string | null;
}

export function SettingsView(props: SettingsViewProps) {
    let { t } = useTranslation();
    const triggerSettingsRefresh = useAppStore((state) => state.triggerSettingsRefresh);
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const navigate = useNavigate();
    const clearSession = useAppStore((state) => state.clearSession);
    const setSession = useAppStore((state) => state.setSession);
    
    // User settings state
    let [meat, setMeat] = useState(false);
    let [vegetarian, setVegetarian] = useState(true);
    let [vegan, setVegan] = useState(true);
    let [gluten, setGluten] = useState(true);
    let [histamine, setHistamine] = useState(true);
    let [fructose, setFructose] = useState(true);
    let [lactose, setLactose] = useState(true);
    let [userName, setUserName] = useState("");
    let [userColor, setUserColor] = useState<string>("#1890ff");
    let [userLoading, setUserLoading] = useState(true);
    let [userSaving, setUserSaving] = useState(false);
    const setUser = useAuthStore((state) => state.setUser);
    const currentUser = useAuthStore((state) => state.user);
    
    // Session settings state
    let [sessionName, setSessionName] = useState("");
    let [sessionWaiting, setSessionWaiting] = useState(true);
    let [sessionSaving, setSessionSaving] = useState(false);
    let [exporting, setExporting] = useState(false);
    let [importing, setImporting] = useState(false);
    let [reimporting, setReimporting] = useState(false);
    
    // Invites state
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const [invites, setInvites] = useState<InviteToken[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(true);
    
    let options = [
        {"name": "meat", "key": "tags.meat"},
        {"name": "vegetarian", "key": "tags.vegetarian"},
        {"name": "vegan", "key": "tags.vegan"},
        {"name": "histamine", "key": "tags.histamine"},
        {"name": "gluten", "key": "tags.gluten"},
        {"name": "fructose", "key": "tags.fructose"},
        {"name": "lactose", "key": "tags.lactose"},
    ];

    // Load user settings
    useEffect(() => {
        Api.getCurrentUser().then((userData) => {
            setUserName(userData.name || "");
            setMeat(userData.meat || false);
            setVegetarian(userData.vegetarian !== undefined ? userData.vegetarian : true);
            setVegan(userData.vegan !== undefined ? userData.vegan : true);
            setGluten(userData.gluten !== undefined ? userData.gluten : true);
            setHistamine(userData.histamine !== undefined ? userData.histamine : true);
            setFructose(userData.fructose !== undefined ? userData.fructose : true);
            setLactose(userData.lactose !== undefined ? userData.lactose : true);
            setUserColor(userData.color || "#1890ff");
            setUserLoading(false);
        }).catch((error) => {
            console.error("Failed to load user settings:", error);
            message.error(t("settings.loadFailed") || "Failed to load settings");
            setUserLoading(false);
        });
    }, [t]);

    // Load session settings
    useEffect(() => {
        if (!sessionKey) {
            setSessionWaiting(false);
            return;
        }
        Api.getSessionByKey(sessionKey).then((sessionData) => {
            setSessionName(sessionData.name);
            setSessionWaiting(false);
        }).catch((error) => {
            console.error("Failed to load session:", error);
            setSessionWaiting(false);
        });
    }, [sessionKey]);

    // Load invites
    const loadInvites = async () => {
        try {
            const data = await Api.listInvites();
            setInvites(data);
        } catch (err: any) {
            console.error("Failed to load invites:", err);
        } finally {
            setLoadingInvites(false);
        }
    };

    useEffect(() => {
        loadInvites();
    }, []);

    // User settings functions
    function setChecked(type: string, checked: boolean) {
        // Update local state immediately for responsive UI
        switch (type) {
            case "vegetarian":
                if (!checked) {
                    setVegan(true);
                }
                setVegetarian(checked);
                break;
            case "meat":
                if (!checked) {
                    setVegetarian(true);
                    setVegan(true);
                }
                setMeat(checked);
                break;
            case "vegan":
                setVegan(checked);
                break;
            case "gluten":
                setGluten(checked);
                break;
            case "histamine":
                setHistamine(checked);
                break;
            case "fructose":
                setFructose(checked);
                break;
            case "lactose":
                setLactose(checked);
                break;
        }

        // Save to backend
        saveUserSettingToBackend(type, checked);
    }

    function saveUserSettingToBackend(field: string, value: boolean) {
        if (userSaving) return; // Prevent concurrent saves
        
        setUserSaving(true);
        const updateData: any = { [field]: value };
        
        // Handle hierarchical logic: if meat is unchecked, ensure vegetarian and vegan are true
        if (field === "meat" && !value) {
            updateData.vegetarian = true;
            updateData.vegan = true;
        }
        // If vegetarian is unchecked, ensure vegan is true
        if (field === "vegetarian" && !value) {
            updateData.vegan = true;
        }

        Api.updateCurrentUser(updateData).then(() => {
            // Update local state to match backend response
            if (updateData.vegetarian !== undefined) {
                setVegetarian(updateData.vegetarian);
            }
            if (updateData.vegan !== undefined) {
                setVegan(updateData.vegan);
            }
            setUserSaving(false);
            // Trigger refresh of ingredients in MainScreen
            triggerSettingsRefresh();
        }).catch((error) => {
            console.error("Failed to save user settings:", error);
            message.error(t("settings.saveFailed") || "Failed to save settings");
            // Reload from backend to revert changes
            Api.getCurrentUser().then((userData) => {
                setMeat(userData.meat || false);
                setVegetarian(userData.vegetarian !== undefined ? userData.vegetarian : true);
                setVegan(userData.vegan !== undefined ? userData.vegan : true);
                setGluten(userData.gluten !== undefined ? userData.gluten : true);
                setHistamine(userData.histamine !== undefined ? userData.histamine : true);
                setFructose(userData.fructose !== undefined ? userData.fructose : true);
                setLactose(userData.lactose !== undefined ? userData.lactose : true);
            });
            setUserSaving(false);
        });
    }

    function onUserNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const newName = e.target.value;
        setUserName(newName);
        
        // Save to backend
        if (userSaving) return;
        setUserSaving(true);
        Api.updateCurrentUser({ name: newName }).then(() => {
            setUserSaving(false);
            // Name change doesn't affect ingredients, but trigger refresh anyway for consistency
            triggerSettingsRefresh();
        }).catch((error) => {
            console.error("Failed to save name:", error);
            message.error(t("settings.saveFailed") || "Failed to save name");
            // Reload from backend
            Api.getCurrentUser().then((userData) => {
                setUserName(userData.name || "");
            });
            setUserSaving(false);
        });
    }

    function onUserColorChanged(color: string) {
        setUserColor(color);
        
        // Save to backend
        if (userSaving) return;
        setUserSaving(true);
        Api.updateCurrentUser({ color: color }).then(() => {
            setUserSaving(false);
            // Update auth store with new color
            if (currentUser) {
                setUser({ ...currentUser, color: color });
            }
            triggerSettingsRefresh();
        }).catch((error) => {
            console.error("Failed to save color:", error);
            message.error(t("settings.saveFailed") || "Failed to save color");
            // Reload from backend
            Api.getCurrentUser().then((userData) => {
                setUserColor(userData.color || "#1890ff");
            });
            setUserSaving(false);
        });
    }

    function getValue(type: string): boolean {
        switch (type) {
            case "meat": return meat;
            case "vegetarian": return vegetarian;
            case "vegan": return vegan;
            case "gluten": return gluten;
            case "histamine": return histamine;
            case "fructose": return fructose;
            case "lactose": return lactose;
            default: return false;
        }
    }

    // Session settings functions
    function onSessionNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setSessionName(e.target.value);
    }

    function onSaveSessionName() {
        if (!session || !sessionName.trim()) return;
        setSessionSaving(true);
        Api.updateSession(session.id, sessionName.trim()).then((updatedSession) => {
            setSession(updatedSession);
            message.success(t("common.saved") || "Saved");
            setSessionSaving(false);
        }).catch((error) => {
            console.error("Failed to update session:", error);
            message.error(t("common.saveFailed") || "Failed to save");
            setSessionSaving(false);
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

    // Invites functions
    const onInviteFinish = async (values: { email: string }) => {
        setInviteLoading(true);
        setInviteError(null);
        setInviteSuccess(null);
        try {
            await Api.createInvite(values.email);
            setInviteSuccess(t("invite.tokenCreated"));
            loadInvites();
        } catch (err: any) {
            setInviteError(err.message || t("invite.creationFailed"));
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRevoke = async (inviteId: number) => {
        try {
            await Api.revokeInvite(inviteId);
            setInviteSuccess(t("invite.tokenRevoked"));
            loadInvites();
        } catch (err: any) {
            setInviteError(err.message || t("invite.revokeFailed"));
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date();
    };

    // User Settings Tab Content
    const userSettingsTab = (
        <div>
            {userLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
            <Form.Item label={t("settings.iAm")}>
                <Input
                    value={userName}
                    onChange={onUserNameChanged}
                    placeholder={t("common.enterName")}
                    disabled={userSaving}
                />
            </Form.Item>
            <Form.Item label={t("settings.color") || "Color"}>
                <ColorPicker
                    value={userColor}
                    onChangeComplete={(color) => onUserColorChanged(color.toHexString())}
                    disabled={userSaving}
                    showText
                    format="hex"
                />
            </Form.Item>
            <Form.Item label={t("settings.allOkToSnack")}>
                <Space wrap>
                    {options.map((option) => (
                        <Switch
                            key={option.name}
                            checked={getValue(option.name)}
                            onChange={(checked) => setChecked(option.name, checked)}
                            checkedChildren={t(option.key)}
                            unCheckedChildren={t(option.key)}
                            disabled={userSaving}
                        />
                    ))}
                </Space>
            </Form.Item>
                </>
            )}
        </div>
    );

    // Session Settings Tab Content
    const sessionSettingsTab = (
        <div>
            {sessionWaiting ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    <Form.Item label={t("session.sessionName")}>
                        <Input
                            value={sessionName}
                            onChange={onSessionNameChanged}
                            placeholder={t("common.enterName")}
                            onPressEnter={onSaveSessionName}
                            disabled={sessionWaiting || sessionSaving}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button 
                            type="primary" 
                            onClick={onSaveSessionName} 
                            loading={sessionSaving}
                            disabled={!sessionName.trim() || sessionName === session?.name || sessionWaiting}
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
                </>
            )}
        </div>
    );

    // Invites Tab Content
    const invitesTab = (
        <div>
            <Card title={t("invite.generateToken")} style={{ marginBottom: 16 }}>
                {inviteError && (
                    <Alert
                        message={inviteError}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setInviteError(null)}
                        style={{ marginBottom: 16 }}
                    />
                )}
                {inviteSuccess && (
                    <Alert
                        message={inviteSuccess}
                        type="success"
                        showIcon
                        closable
                        onClose={() => setInviteSuccess(null)}
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Form
                    name="createInvite"
                    onFinish={onInviteFinish}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label={t("invite.email")}
                        name="email"
                        rules={[
                            { required: true, message: t("invite.emailRequired") },
                            { type: 'email', message: t("invite.emailInvalid") }
                        ]}
                    >
                        <Input placeholder={t("invite.emailPlaceholder")} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={inviteLoading}>
                            {t("invite.generate")}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            <Card title={t("invite.myInvites")}>
                <List
                    loading={loadingInvites}
                    dataSource={invites}
                    renderItem={(invite: InviteToken) => (
                        <List.Item
                            actions={[
                                !invite.is_used && !isExpired(invite.expires_at) ? (
                                    <Popconfirm
                                        title={t("invite.revokeConfirm")}
                                        onConfirm={() => handleRevoke(invite.id)}
                                        okText={t("common.yes")}
                                        cancelText={t("common.no")}
                                    >
                                        <Button danger size="small">
                                            {t("invite.revoke")}
                                        </Button>
                                    </Popconfirm>
                                ) : null
                            ].filter(Boolean)}
                        >
                            <List.Item.Meta
                                title={
                                    <Space>
                                        <span>{invite.email}</span>
                                        {invite.is_used && <Tag color="green">{t("invite.used")}</Tag>}
                                        {!invite.is_used && isExpired(invite.expires_at) && (
                                            <Tag color="red">{t("invite.expired")}</Tag>
                                        )}
                                        {!invite.is_used && !isExpired(invite.expires_at) && (
                                            <Tag color="blue">{t("invite.active")}</Tag>
                                        )}
                                    </Space>
                                }
                                description={
                                    <div>
                                        <div>
                                            <strong>{t("invite.token")}:</strong> <code>{invite.token}</code>
                                        </div>
                                        <div>
                                            <strong>{t("invite.expiresAt")}:</strong> {formatDate(invite.expires_at)}
                                        </div>
                                        {invite.is_used && invite.used_at && (
                                            <div>
                                                <strong>{t("invite.usedAt")}:</strong> {formatDate(invite.used_at)}
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );

    // Event Settings Tab Content
    const eventSettingsTab = (
        <div>
            {sessionKey ? (
                <EventConfigView sessionKey={sessionKey} sessionId={session?.id} />
            ) : (
                <Card>
                    <Alert
                        message={t("settings.noSession") || "No active session"}
                        type="warning"
                        showIcon
                    />
                </Card>
            )}
        </div>
    );

    return (
        <Tabs
            defaultActiveKey="user"
            items={[
                {
                    key: "user",
                    label: t("settings.userSettings") || "User Settings",
                    children: userSettingsTab,
                },
                {
                    key: "session",
                    label: t("settings.sessionSettings") || "Session Settings",
                    children: sessionSettingsTab,
                },
                {
                    key: "events",
                    label: t("settings.eventSettings") || "Event Settings",
                    children: eventSettingsTab,
                },
                {
                    key: "invites",
                    label: t("common.invites") || "Invites",
                    children: invitesTab,
                },
            ]}
        />
    );
}
