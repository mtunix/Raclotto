import React, {useState, useEffect} from "react";
import {Form, Input, Switch, Space, message, Spin, Button, Tabs, Card, List, Tag, Alert, ColorPicker, Modal, Radio, Select, Row, Col, Typography, Checkbox, Slider, Divider} from "antd";
import {UploadOutlined, DownloadOutlined, CopyOutlined, CloseOutlined, LockOutlined} from "@ant-design/icons";
import {Ingredient, IngredientType} from "../model/ingredient";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {Api} from "../lib/api";
import {useCurrentUser, useSession, useInvites, mutateUser, mutateSession, mutateInvites, mutatePansPaginated} from "../lib/api/swrHooks";
import {useAppStore} from "../AppSlice";
import {useAuthStore} from "../AuthSlice";
import {EventConfigView} from "./EventConfigView";
import {ConfirmDeleteButton} from "./ConfirmDeleteButton";
import {TagChipGroup} from "./common/TagChipGroup";
import {changeLanguage} from "../i18n";

const { Text } = Typography;

type SettingsViewProps = {};

interface InviteToken {
    id: number;
    token: string;
    email: string;
    expires_at: string;
    is_used: boolean;
    used_at: string | null;
}

interface EditableIngredientItemProps {
    ingredient: Ingredient;
    index: number;
    onChange: (index: number, field: keyof Ingredient, value: any) => void;
    errors: Record<string, string> | undefined;
}

function EditableIngredientItem({ ingredient, index, onChange, errors }: EditableIngredientItemProps) {
    const { t } = useTranslation();
    
    return (
        <Card 
            style={{ 
                marginBottom: '16px',
                borderRadius: '12px',
                border: errors && Object.keys(errors).length > 0 ? '1px solid #ff4d4f' : '1px solid #d9d9d9'
            }}
            bodyStyle={{ padding: '16px' }}
        >
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item 
                        label={t("ingredient.ingredientName") || "Name"}
                        validateStatus={errors?.name ? 'error' : ''}
                        help={errors?.name}
                    >
                        <Input
                            value={ingredient.name}
                            onChange={(e) => onChange(index, 'name', e.target.value)}
                            placeholder={t("ingredient.ingredientName") || "Name"}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item 
                        label={t("ingredient.type") || "Type"}
                        validateStatus={errors?.type ? 'error' : ''}
                        help={errors?.type}
                    >
                        <Select
                            value={ingredient.type}
                            onChange={(value) => onChange(index, 'type', value)}
                            style={{ width: '100%' }}
                        >
                            <Select.Option value={IngredientType.FILL}>
                                {t("ingredient.fill") || "FILL"}
                            </Select.Option>
                            <Select.Option value={IngredientType.SAUCE}>
                                {t("ingredient.sauce") || "SAUCE"}
                            </Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item label={t("ingredient.available")}>
                        <Switch
                            checked={ingredient.available}
                            onChange={(checked) => onChange(index, 'available', checked)}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24}>
                    <Form.Item 
                        label={t("settings.dietaryTags") || "Dietary Tags"}
                        validateStatus={errors?.dietary ? 'error' : ''}
                        help={errors?.dietary}
                    >
                        <Space wrap>
                            <Switch
                                checked={ingredient.meat}
                                onChange={(checked) => {
                                    if (checked) {
                                        // Uncheck other categories
                                        onChange(index, 'vegetarian', false);
                                        onChange(index, 'vegan', false);
                                        onChange(index, 'fish', false);
                                    }
                                    onChange(index, 'meat', checked);
                                }}
                                checkedChildren={t("tags.meat") || "Meat"}
                                unCheckedChildren={t("tags.meat") || "Meat"}
                            />
                            <Switch
                                checked={ingredient.vegetarian}
                                onChange={(checked) => {
                                    if (checked) {
                                        // Uncheck other categories
                                        onChange(index, 'meat', false);
                                        onChange(index, 'vegan', false);
                                        onChange(index, 'fish', false);
                                    }
                                    onChange(index, 'vegetarian', checked);
                                }}
                                checkedChildren={t("tags.vegetarian") || "Vegetarian"}
                                unCheckedChildren={t("tags.vegetarian") || "Vegetarian"}
                            />
                            <Switch
                                checked={ingredient.vegan}
                                onChange={(checked) => {
                                    if (checked) {
                                        // Uncheck other categories
                                        onChange(index, 'meat', false);
                                        onChange(index, 'vegetarian', false);
                                        onChange(index, 'fish', false);
                                    }
                                    onChange(index, 'vegan', checked);
                                }}
                                checkedChildren={t("tags.vegan") || "Vegan"}
                                unCheckedChildren={t("tags.vegan") || "Vegan"}
                            />
                            <Switch
                                checked={ingredient.fish || false}
                                onChange={(checked) => {
                                    if (checked) {
                                        // Uncheck other categories
                                        onChange(index, 'meat', false);
                                        onChange(index, 'vegetarian', false);
                                        onChange(index, 'vegan', false);
                                    }
                                    onChange(index, 'fish', checked);
                                }}
                                checkedChildren={t("tags.fish") || "Fish"}
                                unCheckedChildren={t("tags.fish") || "Fish"}
                            />
                            <Switch
                                checked={ingredient.gluten}
                                onChange={(checked) => onChange(index, 'gluten', checked)}
                                checkedChildren={t("tags.gluten") || "Gluten"}
                                unCheckedChildren={t("tags.gluten") || "Gluten"}
                            />
                            <Switch
                                checked={ingredient.histamine}
                                onChange={(checked) => onChange(index, 'histamine', checked)}
                                checkedChildren={t("tags.histamine") || "Histamine"}
                                unCheckedChildren={t("tags.histamine") || "Histamine"}
                            />
                            <Switch
                                checked={ingredient.fructose}
                                onChange={(checked) => onChange(index, 'fructose', checked)}
                                checkedChildren={t("tags.fructose") || "Fructose"}
                                unCheckedChildren={t("tags.fructose") || "Fructose"}
                            />
                            <Switch
                                checked={ingredient.lactose}
                                onChange={(checked) => onChange(index, 'lactose', checked)}
                                checkedChildren={t("tags.lactose") || "Lactose"}
                                unCheckedChildren={t("tags.lactose") || "Lactose"}
                            />
                        </Space>
                    </Form.Item>
                </Col>
                <Col xs={24}>
                    <Form.Item 
                        label={t("ingredient.additionalProperties") || "Additional Properties"}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                                <div style={{ marginBottom: '8px' }}>
                                    {t("ingredient.spicy") || "Spicy"} ({ingredient.spicy || 0}/3)
                                </div>
                                <Slider
                                    min={0}
                                    max={3}
                                    value={ingredient.spicy || 0}
                                    onChange={(value) => onChange(index, 'spicy', value)}
                                    marks={{ 0: '0', 1: '1', 2: '2', 3: '3' }}
                                />
                            </div>
                            <Checkbox
                                checked={ingredient.wildcard || false}
                                onChange={(e) => onChange(index, 'wildcard', e.target.checked)}
                            >
                                {t("ingredient.wildcard") || "Wildcard"}
                            </Checkbox>
                            <Checkbox
                                checked={ingredient.sweet || false}
                                onChange={(e) => onChange(index, 'sweet', e.target.checked)}
                            >
                                {t("ingredient.sweet") || "Sweet"}
                            </Checkbox>
                        </Space>
                    </Form.Item>
                </Col>
            </Row>
        </Card>
    );
}

export function SettingsView(props: SettingsViewProps) {
    let { t } = useTranslation();
    const triggerSettingsRefresh = useAppStore((state) => state.triggerSettingsRefresh);
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const navigate = useNavigate();
    const clearSession = useAppStore((state) => state.clearSession);
    const setSession = useAppStore((state) => state.setSession);
    
    // Use SWR hooks for data fetching
    const { data: userData, isLoading: userLoading, error: userError } = useCurrentUser();
    const { data: sessionData, isLoading: sessionWaiting } = useSession(sessionKey);
    const { data: invitesData = [], isLoading: loadingInvites } = useInvites();
    
    // User settings state
    let [meat, setMeat] = useState(false);
    let [vegetarian, setVegetarian] = useState(true);
    let [vegan, setVegan] = useState(true);
    let [fish, setFish] = useState(false);
    let [gluten, setGluten] = useState(true);
    let [histamine, setHistamine] = useState(true);
    let [fructose, setFructose] = useState(true);
    let [lactose, setLactose] = useState(true);
    let [userName, setUserName] = useState("");
    let [userColor, setUserColor] = useState<string>("#1890ff");
    let [userLanguage, setUserLanguage] = useState<string>("de");
    let [borderStyle, setBorderStyle] = useState<string>("solid");
    let [borderTexture, setBorderTexture] = useState<string | null>(null);
    let [glowEffect, setGlowEffect] = useState<boolean>(false);
    let [userSaving, setUserSaving] = useState(false);
    
    // Track initial state for dirty checking
    const [initialUserState, setInitialUserState] = useState<{
        name: string;
        color: string;
        language: string;
        border_style: string;
        border_texture: string | null;
        glow_effect: boolean;
        meat: boolean;
        vegetarian: boolean;
        vegan: boolean;
        fish: boolean;
        gluten: boolean;
        histamine: boolean;
        fructose: boolean;
        lactose: boolean;
    } | null>(null);
    
    const setUser = useAuthStore((state) => state.setUser);
    const currentUser = useAuthStore((state) => state.user);
    
    // Session settings state
    let [sessionName, setSessionName] = useState("");
    let [sessionSaving, setSessionSaving] = useState(false);
    let [exporting, setExporting] = useState(false);
    let [importing, setImporting] = useState(false);
    let [reimporting, setReimporting] = useState(false);
    const [closeSessionModalVisible, setCloseSessionModalVisible] = useState(false);
    
    // Export modal state
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [exportJson, setExportJson] = useState<string>("");
    
    // Import modal state
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importMode, setImportMode] = useState<'import' | 'reimport'>('import');
    const [stagingIngredients, setStagingIngredients] = useState<Ingredient[]>([]);
    const [importValidationErrors, setImportValidationErrors] = useState<Record<number, Record<string, string>>>({});
    const [importJsonInput, setImportJsonInput] = useState<string>("");
    
    // Invites state
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const invites = invitesData as InviteToken[];
    
    let options = [
        {"name": "meat", "key": "tags.meat"},
        {"name": "vegetarian", "key": "tags.vegetarian"},
        {"name": "vegan", "key": "tags.vegan"},
        {"name": "fish", "key": "tags.fish"},
        {"name": "histamine", "key": "tags.histamine"},
        {"name": "gluten", "key": "tags.gluten"},
        {"name": "fructose", "key": "tags.fructose"},
        {"name": "lactose", "key": "tags.lactose"},
    ];

    // Update local state when SWR data changes
    useEffect(() => {
        if (userData) {
            // Handle both flattened and nested attribute structures
            const attributes = userData.attributes || userData;
            const name = attributes.name || "";
            const color = attributes.color || "#1890ff";
            const language = attributes.language || "de";
            const border_style = attributes.border_style || "solid";
            const border_texture = attributes.border_texture || null;
            const glow_effect = attributes.glow_effect || false;
            const meat = attributes.meat || false;
            const vegetarian = attributes.vegetarian !== undefined ? attributes.vegetarian : true;
            const vegan = attributes.vegan !== undefined ? attributes.vegan : true;
            const fish = attributes.fish || false;
            const gluten = attributes.gluten !== undefined ? attributes.gluten : true;
            const histamine = attributes.histamine !== undefined ? attributes.histamine : true;
            const fructose = attributes.fructose !== undefined ? attributes.fructose : true;
            const lactose = attributes.lactose !== undefined ? attributes.lactose : true;
            
            setUserName(name);
            setMeat(meat);
            setVegetarian(vegetarian);
            setVegan(vegan);
            setFish(fish);
            setGluten(gluten);
            setHistamine(histamine);
            setFructose(fructose);
            setLactose(lactose);
            setUserColor(color);
            setUserLanguage(language);
            setBorderStyle(border_style);
            setBorderTexture(border_texture);
            setGlowEffect(glow_effect);
            
            // Set initial state for dirty checking
            setInitialUserState({
                name,
                color,
                language,
                border_style,
                border_texture,
                glow_effect,
                meat,
                vegetarian,
                vegan,
                fish,
                gluten,
                histamine,
                fructose,
                lactose
            });
        }
    }, [userData]);

    useEffect(() => {
        if (userError) {
            message.error(t("settings.loadFailed") || "Failed to load settings");
        }
    }, [userError, t]);

    useEffect(() => {
        if (sessionData) {
            setSessionName(sessionData.name);
        }
    }, [sessionData]);

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
            case "fish":
                setFish(checked);
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
    }

    function onUserNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setUserName(e.target.value);
    }

    function onUserColorChanged(color: string) {
        setUserColor(color);
    }

    const isUserSettingsDirty = () => {
        if (!initialUserState) return false;
        
        return (
            userName !== initialUserState.name ||
            userColor !== initialUserState.color ||
            userLanguage !== initialUserState.language ||
            borderStyle !== initialUserState.border_style ||
            borderTexture !== initialUserState.border_texture ||
            glowEffect !== initialUserState.glow_effect ||
            meat !== initialUserState.meat ||
            vegetarian !== initialUserState.vegetarian ||
            vegan !== initialUserState.vegan ||
            fish !== initialUserState.fish ||
            gluten !== initialUserState.gluten ||
            histamine !== initialUserState.histamine ||
            fructose !== initialUserState.fructose ||
            lactose !== initialUserState.lactose
        );
    };

    const handleSaveUserSettings = async () => {
        if (!isUserSettingsDirty() || userSaving) return;
        
        setUserSaving(true);
        
        try {
            const updateData: any = {
                name: userName,
                color: userColor,
                language: userLanguage,
                border_style: borderStyle,
                border_texture: borderTexture,
                glow_effect: glowEffect,
                meat,
                vegetarian,
                vegan,
                fish,
                gluten,
                histamine,
                fructose,
                lactose
            };
            
            // Handle hierarchical logic:
            // If meat is checked, vegetarian and vegan must be true (hierarchy: meat -> vegetarian -> vegan)
            if (meat) {
                updateData.vegetarian = true;
                updateData.vegan = true;
            }
            // If vegetarian is checked, vegan must be true
            else if (vegetarian) {
                updateData.vegan = true;
            }
            // If all are unchecked, ensure at least one is true (default to vegetarian and vegan)
            else if (!meat && !vegetarian && !vegan) {
                updateData.vegetarian = true;
                updateData.vegan = true;
            }
            
            await Api.updateCurrentUser(updateData);
            
            // Change i18n language if it changed
            if (userLanguage !== initialUserState?.language) {
                changeLanguage(userLanguage);
            }
            
            // Update initial state
            setInitialUserState({
                name: userName,
                color: userColor,
                language: userLanguage,
                border_style: borderStyle,
                border_texture: borderTexture,
                glow_effect: glowEffect,
                meat,
                vegetarian: updateData.vegetarian !== undefined ? updateData.vegetarian : vegetarian,
                vegan: updateData.vegan !== undefined ? updateData.vegan : vegan,
                fish,
                gluten,
                histamine,
                fructose,
                lactose
            });
            
            // Update local state to match backend response
            if (updateData.vegetarian !== undefined) {
                setVegetarian(updateData.vegetarian);
            }
            if (updateData.vegan !== undefined) {
                setVegan(updateData.vegan);
            }
            
            // Invalidate cache to trigger refetch
            mutateUser();
            
            // Invalidate pans cache so HistoryView shows updated border preferences
            if (sessionKey) {
                mutatePansPaginated(sessionKey);
            }
            
            // Update auth store with new color, language, and border preferences
            if (currentUser) {
                setUser({ 
                    ...currentUser, 
                    color: userColor, 
                    language: userLanguage,
                    border_style: borderStyle,
                    border_texture: borderTexture,
                    glow_effect: glowEffect
                });
            }
            
            message.success(t("common.saved") || "Saved");
            triggerSettingsRefresh();
        } catch (error) {
            console.error("Failed to save user settings:", error);
            message.error(t("settings.saveFailed") || "Failed to save settings");
            // Reload from backend to revert changes
            mutateUser();
        } finally {
            setUserSaving(false);
        }
    };

    const tagValues = {
        meat,
        vegetarian,
        vegan,
        fish,
        gluten,
        histamine,
        fructose,
        lactose
    };

    // Session settings functions
    function onSessionNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        setSessionName(e.target.value);
    }

    function onSaveSessionName() {
        if (!session || !sessionName.trim()) return;
        setSessionSaving(true);
        Api.updateSession(session.id, sessionName.trim()).then((updatedSession) => {
            setSession(updatedSession);
            // Invalidate cache to trigger refetch
            mutateSession(sessionKey);
            message.success(t("common.saved") || "Saved");
            setSessionSaving(false);
        }).catch((error) => {
            console.error("Failed to update session:", error);
            message.error(t("common.saveFailed") || "Failed to save");
            setSessionSaving(false);
        });
    }

    function onCloseSession() {
        setCloseSessionModalVisible(true);
    }

    function handleConfirmCloseSession() {
        if (!sessionKey) return;
        Api.close(sessionKey).then(() => {
            clearSession();
            setCloseSessionModalVisible(false);
            navigate("/");
        }).catch((error) => {
            console.error("Failed to close session:", error);
            message.error(t("session.closeFailed") || "Failed to close session");
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
            const jsonString = JSON.stringify(data, null, 2);
            setExportJson(jsonString);
            setExportModalVisible(true);
            
            // Auto-copy to clipboard
            navigator.clipboard.writeText(jsonString).then(() => {
                message.success(t("settings.copiedToClipboard") || "Copied to clipboard");
            }).catch((err) => {
                console.error("Failed to copy to clipboard:", err);
            });
            
            setExporting(false);
        }).catch((error) => {
            console.error("Failed to export ingredients:", error);
            message.error(t("settings.exportFailed") || "Failed to export ingredients");
            setExporting(false);
        });
    }
    
    function handleCopyExport() {
        navigator.clipboard.writeText(exportJson).then(() => {
            message.success(t("settings.copiedToClipboard") || "Copied to clipboard");
        }).catch((err) => {
            console.error("Failed to copy to clipboard:", err);
            message.error(t("settings.copyFailed") || "Failed to copy to clipboard");
        });
    }
    
    // Validation functions
    function validateIngredient(ingredient: Ingredient, index: number): Record<string, string> {
        const errors: Record<string, string> = {};
        
        if (!ingredient.name || ingredient.name.trim() === '') {
            errors.name = t("settings.validationError.nameRequired") || "Name is required";
        }
        
        if (!ingredient.type || (ingredient.type !== IngredientType.FILL && ingredient.type !== IngredientType.SAUCE)) {
            errors.type = t("settings.validationError.typeRequired") || "Type must be FILL (1) or SAUCE (2)";
        }
        
        const meat = ingredient.meat || false;
        const vegetarian = ingredient.vegetarian || false;
        const vegan = ingredient.vegan || false;
        
        if (!meat && !vegetarian && !vegan) {
            errors.dietary = t("settings.validationError.dietaryRequired") || "At least one of meat, vegetarian, or vegan must be true";
        }
        
        if (meat && (vegetarian || vegan)) {
            errors.dietary = t("settings.validationError.meatConflict") || "Meat cannot be true with vegetarian or vegan";
        }
        
        if (vegetarian && vegan) {
            errors.dietary = t("settings.validationError.vegetarianVeganConflict") || "Vegetarian and vegan cannot both be true";
        }
        
        return errors;
    }
    
    function validateAllIngredients(): boolean {
        const newErrors: Record<number, Record<string, string>> = {};
        let hasErrors = false;
        
        stagingIngredients.forEach((ingredient, index) => {
            const errors = validateIngredient(ingredient, index);
            if (Object.keys(errors).length > 0) {
                newErrors[index] = errors;
                hasErrors = true;
            }
        });
        
        setImportValidationErrors(newErrors);
        return !hasErrors;
    }
    
    function handleIngredientChange(index: number, field: keyof Ingredient, value: any) {
        const updated = [...stagingIngredients];
        updated[index] = { ...updated[index], [field]: value };
        setStagingIngredients(updated);
        
        // Real-time validation
        const errors = validateIngredient(updated[index], index);
        setImportValidationErrors(prev => {
            const newErrors = { ...prev };
            if (Object.keys(errors).length > 0) {
                newErrors[index] = errors;
            } else {
                delete newErrors[index];
            }
            return newErrors;
        });
    }
    
    function normalizeIngredient(ing: any): Ingredient {
        return {
            id: ing.id || 0,
            name: ing.name || '',
            type: typeof ing.type === 'number' ? ing.type : (ing.type === 'FILL' || ing.type === 1 ? IngredientType.FILL : IngredientType.SAUCE),
            available: ing.available !== undefined ? ing.available : true,
            meat: ing.meat || false,
            vegetarian: ing.vegetarian || false,
            vegan: ing.vegan || false,
            gluten: ing.gluten || false,
            histamine: ing.histamine || false,
            fructose: ing.fructose || false,
            lactose: ing.lactose || false,
        };
    }
    
    function handleJsonInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const text = e.target.value;
        setImportJsonInput(text);
        try {
            const data = JSON.parse(text);
            if (!data.ingredients || !Array.isArray(data.ingredients)) {
                // Don't show error while typing, just clear staging
                if (text.trim() !== '') {
                    setStagingIngredients([]);
                }
                return;
            }
            const normalized = data.ingredients.map(normalizeIngredient);
            setStagingIngredients(normalized);
        } catch (error) {
            // Invalid JSON, but don't show error while typing
            if (text.trim() !== '') {
                setStagingIngredients([]);
            }
        }
    }
    
    function handleCloseImportModal() {
        setImportModalVisible(false);
        setStagingIngredients([]);
        setImportValidationErrors({});
        setImportJsonInput("");
        setImportMode('import');
    }
    
    function handleSubmitImport() {
        if (!validateAllIngredients()) {
            message.error(t("settings.validationErrors") || "Please fix validation errors before submitting");
            return;
        }
        
        if (!sessionKey) {
            message.error(t("settings.noSession") || "No session selected");
            return;
        }
        
        // Prepare ingredients for submission
        // For import mode, remove IDs (backend will create new ones)
        // For reimport mode, keep IDs if they exist
        const ingredientsToSubmit = stagingIngredients.map(ing => {
            const { applicable, ...ingredient } = ing;
            if (importMode === 'import') {
                // Remove ID for import mode
                const { id, ...ingredientWithoutId } = ingredient;
                return ingredientWithoutId;
            }
            return ingredient;
        });
        
        const submitFn = importMode === 'import' 
            ? () => Api.importIngredients(sessionKey, ingredientsToSubmit)
            : () => Api.reimportIngredients(sessionKey, ingredientsToSubmit);
        
        const loadingState = importMode === 'import' ? setImporting : setReimporting;
        loadingState(true);
        
        submitFn().then((result: any) => {
            if (importMode === 'import') {
                message.success(t("settings.importSuccess", { count: result.created }) || `Successfully imported ${result.created} ingredients`);
            } else {
                message.success(
                    t("settings.reimportSuccess", {
                        created: result.created,
                        updated: result.updated || 0,
                        deleted: result.deleted || 0
                    }) || `Reimported: ${result.created} created, ${result.updated || 0} updated, ${result.deleted || 0} deleted`
                );
            }
            triggerSettingsRefresh();
            handleCloseImportModal();
            loadingState(false);
        }).catch((error) => {
            console.error(`Failed to ${importMode} ingredients:`, error);
            message.error(importMode === 'import' 
                ? (t("settings.importFailed") || "Failed to import ingredients")
                : (t("settings.reimportFailed") || "Failed to reimport ingredients")
            );
            loadingState(false);
        });
    }


    // Invites functions
    const onInviteFinish = async (values: { email: string }) => {
        setInviteLoading(true);
        setInviteError(null);
        try {
            await Api.createInvite(values.email);
            // Invalidate cache to trigger refetch
            mutateInvites();
            message.success(t("invite.tokenCreated"));
        } catch (err: any) {
            setInviteError(err.message || t("invite.creationFailed"));
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRevoke = async (inviteId: number) => {
        try {
            await Api.revokeInvite(inviteId);
            // Invalidate cache to trigger refetch
            mutateInvites();
            message.success(t("invite.tokenRevoked"));
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

    const handleCopyToken = (token: string) => {
        navigator.clipboard.writeText(token).then(() => {
            message.success(t("settings.copiedToClipboard") || "Copied to clipboard");
        }).catch((err) => {
            console.error("Failed to copy to clipboard:", err);
            message.error(t("settings.copyFailed") || "Failed to copy to clipboard");
        });
    };

    // User Settings Tab Content
    const userSettingsTab = (
        <div style={{ padding: '8px 0' }}>
            {userLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                </div>
            ) : (
                <Card 
                    style={{ 
                        borderRadius: '18px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: 'none'
                    }}
                    bodyStyle={{ padding: '24px' }}
                >
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>{t("settings.iAm")}</span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <Input
                            size="large"
                            value={userName}
                            onChange={onUserNameChanged}
                            placeholder={t("common.enterName")}
                            disabled={userSaving}
                        />
                    </Form.Item>
                    
                    {/* Border Customization Section */}
                    <div style={{ marginTop: '32px', marginBottom: '24px' }}>
                        <Divider style={{ marginBottom: '16px' }}>
                            <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                {t("settings.borderCustomization") || "Border Customization"}
                            </span>
                        </Divider>
                    </div>
                    
                    <Alert
                        message={t("settings.borderCustomizationInfo") || "Note: When a texture is selected, color and style settings are not applied."}
                        type="info"
                        showIcon
                        style={{ marginBottom: '24px' }}
                    />
                    
                    {/* Border Color - disabled when texture is selected */}
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: borderTexture ? '#d9d9d9' : '#1d1d1f' }}>
                            {t("settings.color") || "Color"}
                            {borderTexture && (
                                <Text type="secondary" style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 'normal' }}>
                                    ({t("settings.disabledWithTexture") || "Disabled when texture is active"})
                                </Text>
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <div style={{ width: '100%', display: 'block', opacity: borderTexture ? 0.6 : 1 }}>
                            <ColorPicker
                                value={userColor}
                                onChangeComplete={(color) => onUserColorChanged(color.toHexString())}
                                disabled={userSaving || !!borderTexture}
                                showText
                                format="hex"
                                style={{ width: '100%', display: 'block' }}
                            />
                        </div>
                        {borderTexture && (
                            <div style={{ marginTop: '8px' }}>
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.colorDisabledInfo") || "Color is not applied when a texture is selected."}
                                </Text>
                            </div>
                        )}
                    </Form.Item>
                    
                    {/* Border Style - disabled when texture is selected */}
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: borderTexture ? '#d9d9d9' : '#1d1d1f' }}>
                            {t("settings.borderStyle") || "Border Style"}
                            {currentUser?.level && currentUser.level.id < 3 && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                            {borderTexture && currentUser?.level && currentUser.level.id >= 3 && (
                                <Text type="secondary" style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 'normal' }}>
                                    ({t("settings.disabledWithTexture") || "Disabled when texture is active"})
                                </Text>
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <div style={{ opacity: borderTexture ? 0.6 : 1 }}>
                            <Select
                                value={borderStyle}
                                onChange={(value) => setBorderStyle(value)}
                                disabled={userSaving || (currentUser?.level ? currentUser.level.id < 3 : true) || !!borderTexture}
                                size="large"
                                style={{ width: '100%' }}
                            >
                                <Select.Option value="solid">{t("borderStyle.solid") || "Solid"}</Select.Option>
                                <Select.Option value="dashed">{t("borderStyle.dashed") || "Dashed"}</Select.Option>
                                <Select.Option value="dotted">{t("borderStyle.dotted") || "Dotted"}</Select.Option>
                                <Select.Option value="double">{t("borderStyle.double") || "Double"}</Select.Option>
                            </Select>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            {borderTexture ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.styleDisabledInfo") || "Style is not applied when a texture is selected."}
                                </Text>
                            ) : currentUser?.level && currentUser.level.id >= 3 ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderStyleUnlocked") || "Unlocked at level 3"}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderStyleLocked") || "Locked - Reach level 3 to unlock"}
                                </Text>
                            )}
                        </div>
                    </Form.Item>
                    
                    {/* Border Texture - shown last as it's unlocked at level 5 */}
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                            {t("settings.borderTexture") || "Border Texture"}
                            {currentUser?.level && currentUser.level.id < 5 && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <Select
                            value={borderTexture || undefined}
                            onChange={(value) => setBorderTexture(value || null)}
                            disabled={userSaving || (currentUser?.level ? currentUser.level.id < 5 : true)}
                            size="large"
                            style={{ width: '100%' }}
                            allowClear
                            placeholder={t("settings.noTexture") || "No texture"}
                        >
                            <Select.Option value={null}>{t("settings.noTexture") || "No texture"}</Select.Option>
                            <Select.Option value="cheese">{t("texture.cheese") || "Cheese"}</Select.Option>
                            <Select.Option value="bread">{t("texture.bread") || "Bread"}</Select.Option>
                            <Select.Option value="sauce-01">{t("texture.sauce01") || "Sauce 1"}</Select.Option>
                            <Select.Option value="sauce-02">{t("texture.sauce02") || "Sauce 2"}</Select.Option>
                            <Select.Option value="herbs-01">{t("texture.herbs01") || "Herbs 1"}</Select.Option>
                            <Select.Option value="herbs-02">{t("texture.herbs02") || "Herbs 2"}</Select.Option>
                        </Select>
                        <div style={{ marginTop: '8px' }}>
                            {currentUser?.level && currentUser.level.id >= 5 ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderTextureUnlocked") || "Unlocked at level 5"}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.borderTextureLocked") || "Locked - Reach level 5 to unlock"}
                                </Text>
                            )}
                        </div>
                    </Form.Item>
                    
                    {/* Glow Effect - unlocked at level 7 */}
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                            {t("settings.glowEffect") || "Card Glow Effect"}
                            {currentUser?.level && currentUser.level.id < 7 && (
                                <LockOutlined style={{ marginLeft: '8px', color: '#d9d9d9' }} />
                            )}
                        </span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <div style={{ opacity: (currentUser?.level ? currentUser.level.id < 7 : true) ? 0.6 : 1 }}>
                            <Switch
                                checked={glowEffect}
                                onChange={(checked) => setGlowEffect(checked)}
                                disabled={userSaving || (currentUser?.level ? currentUser.level.id < 7 : true)}
                                size="default"
                            />
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            {currentUser?.level && currentUser.level.id >= 7 ? (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.glowEffectUnlocked") || "Unlocked at level 7"}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {t("settings.glowEffectLocked") || "Locked - Reach level 7 to unlock"}
                                </Text>
                            )}
                        </div>
                    </Form.Item>
                    
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>{t("settings.language") || "Language"}</span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <Select
                            value={userLanguage}
                            onChange={(value) => setUserLanguage(value)}
                            disabled={userSaving}
                            size="large"
                            style={{ width: '100%' }}
                        >
                            <Select.Option value="en">English</Select.Option>
                            <Select.Option value="de">Deutsch</Select.Option>
                        </Select>
                        <div style={{ marginTop: '8px' }}>
                            <Text type="secondary" style={{ fontSize: '14px' }}>
                                {t("settings.languageDescription") || "Select your preferred language"}
                            </Text>
                        </div>
                    </Form.Item>
                    <Form.Item 
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>{t("settings.allOkToSnack")}</span>} 
                        style={{ marginBottom: 24 }}
                        labelCol={{ span: 24 }}
                        wrapperCol={{ span: 24 }}
                    >
                        <TagChipGroup
                            options={options}
                            values={tagValues}
                            onChange={setChecked}
                            disabled={userSaving}
                            allowWrap={false}
                        />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleSaveUserSettings}
                            loading={userSaving}
                            disabled={!isUserSettingsDirty() || userSaving}
                            block
                            style={{ 
                                height: '56px',
                                fontSize: '19px',
                                fontWeight: 500,
                                borderRadius: '12px',
                                letterSpacing: '-0.022em'
                            }}
                        >
                            {t("common.save") || "Save"}
                        </Button>
                    </Form.Item>
                </Card>
            )}
        </div>
    );

    // Session Settings Tab Content
    const sessionSettingsTab = (
        <div style={{ padding: '8px 0' }}>
            {sessionWaiting ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    <Card 
                        style={{ 
                            borderRadius: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: 'none',
                            marginBottom: '24px'
                        }}
                        bodyStyle={{ padding: '24px' }}
                    >
                        <Form.Item 
                            label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>{t("session.sessionName")}</span>} 
                            style={{ marginBottom: 24 }}
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
                                style={{ 
                                    height: '44px',
                                    fontSize: '17px',
                                    fontWeight: 500,
                                    borderRadius: '12px',
                                    letterSpacing: '-0.022em'
                                }}
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
                            <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f', marginBottom: '8px' }}>
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
                        style={{ 
                            borderRadius: '18px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: 'none'
                        }}
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

    // Invites Tab Content
    const invitesTab = (
        <div style={{ padding: '8px 0' }}>
            <Card 
                title={<span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.022em' }}>{t("invite.generateToken")}</span>} 
                style={{ 
                    borderRadius: '18px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: 'none',
                    marginBottom: '24px'
                }}
                bodyStyle={{ padding: '24px' }}
            >
                {inviteError && (
                    <Alert
                        message={inviteError}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setInviteError(null)}
                        style={{ marginBottom: 16, borderRadius: '12px' }}
                    />
                )}
                <Form
                    name="createInvite"
                    onFinish={onInviteFinish}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label={<span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>{t("invite.email")}</span>}
                        name="email"
                        rules={[
                            { required: true, message: t("invite.emailRequired") },
                            { type: 'email', message: t("invite.emailInvalid") }
                        ]}
                    >
                        <Input size="large" placeholder={t("invite.emailPlaceholder")} />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button 
                            type="primary" 
                            size="large" 
                            htmlType="submit" 
                            loading={inviteLoading}
                            style={{ 
                                height: '44px',
                                fontSize: '17px',
                                fontWeight: 500,
                                borderRadius: '12px',
                                letterSpacing: '-0.022em'
                            }}
                        >
                            {t("invite.generate")}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            <Card 
                title={<span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.022em' }}>{t("invite.myInvites")}</span>}
                style={{ 
                    borderRadius: '18px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: 'none'
                }}
                bodyStyle={{ padding: '24px' }}
            >
                <List
                    loading={loadingInvites}
                    dataSource={invites}
                    renderItem={(invite: InviteToken) => (
                        <List.Item
                            actions={[
                                <Space key="actions" size="small">
                                    <Button
                                        type="text"
                                        icon={<CopyOutlined />}
                                        onClick={() => handleCopyToken(invite.token)}
                                        size="large"
                                        style={{ 
                                            height: '44px',
                                            width: '44px',
                                            padding: '0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '12px'
                                        }}
                                    />
                                    {!invite.is_used && !isExpired(invite.expires_at) && (
                                        <ConfirmDeleteButton
                                            onConfirm={() => handleRevoke(invite.id)}
                                            danger={true}
                                            icon={<CloseOutlined />}
                                            style={{ 
                                                height: '44px',
                                                width: '44px',
                                                padding: '0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '12px'
                                            }}
                                        />
                                    )}
                                </Space>
                            ]}
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
        <div style={{ padding: '8px 0' }}>
            {sessionKey ? (
                <EventConfigView sessionKey={sessionKey} sessionId={session?.id} />
            ) : (
                <Card
                    style={{ 
                        borderRadius: '18px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: 'none'
                    }}
                    bodyStyle={{ padding: '24px' }}
                >
                    <Alert
                        message={t("settings.noSession") || "No active session"}
                        type="warning"
                        showIcon
                        style={{ borderRadius: '12px' }}
                    />
                </Card>
            )}
        </div>
    );

    return (
        <>
            <Tabs
                defaultActiveKey="user"
                items={[
                    {
                        key: "user",
                        label: <span style={{ fontSize: '17px', fontWeight: 500, letterSpacing: '-0.022em' }}>{t("settings.userSettings") || "User Settings"}</span>,
                        children: userSettingsTab,
                    },
                    {
                        key: "session",
                        label: <span style={{ fontSize: '17px', fontWeight: 500, letterSpacing: '-0.022em' }}>{t("settings.sessionSettings") || "Session Settings"}</span>,
                        children: sessionSettingsTab,
                    },
                    {
                        key: "events",
                        label: <span style={{ fontSize: '17px', fontWeight: 500, letterSpacing: '-0.022em' }}>{t("settings.eventSettings") || "Event Settings"}</span>,
                        children: eventSettingsTab,
                    },
                    {
                        key: "invites",
                        label: <span style={{ fontSize: '17px', fontWeight: 500, letterSpacing: '-0.022em' }}>{t("common.invites") || "Invites"}</span>,
                        children: invitesTab,
                    },
                ]}
            />
            
            {/* Export Modal */}
            <Modal
                title={t("settings.exportModalTitle") || "Export Ingredients"}
                open={exportModalVisible}
                onCancel={() => setExportModalVisible(false)}
                footer={[
                    <Button key="copy" icon={<CopyOutlined />} onClick={handleCopyExport}>
                        {t("settings.copyToClipboard") || "Copy to Clipboard"}
                    </Button>,
                    <Button key="close" onClick={() => setExportModalVisible(false)}>
                        {t("common.close") || "Close"}
                    </Button>
                ]}
                width="80%"
                style={{ maxWidth: '1000px' }}
            >
                <Input.TextArea
                    value={exportJson}
                    readOnly
                    rows={20}
                    style={{ fontFamily: 'monospace', fontSize: '14px' }}
                />
            </Modal>
            
            {/* Close Session Confirmation Modal */}
            <Modal
                title={t("session.confirmCloseTitle") || "End Session?"}
                open={closeSessionModalVisible}
                onCancel={() => setCloseSessionModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setCloseSessionModalVisible(false)}>
                        {t("common.cancel") || "Cancel"}
                    </Button>,
                    <Button 
                        key="confirm"
                        type="primary" 
                        danger
                        onClick={handleConfirmCloseSession}
                    >
                        {t("session.endSession") || "End Session"}
                    </Button>
                ]}
            >
                <p>{t("session.confirmCloseMessage") || "Are you sure you want to end this session? This action cannot be undone."}</p>
            </Modal>

            {/* Import Modal */}
            <Modal
                title={t("settings.importModalTitle") || "Import Ingredients"}
                open={importModalVisible}
                onCancel={handleCloseImportModal}
                footer={[
                    <Button key="cancel" onClick={handleCloseImportModal}>
                        {t("common.cancel") || "Cancel"}
                    </Button>,
                    <Button 
                        key="submit"
                        type="primary" 
                        onClick={handleSubmitImport}
                        disabled={stagingIngredients.length === 0 || Object.keys(importValidationErrors).length > 0 || importing || reimporting}
                        loading={importing || reimporting}
                    >
                        {importMode === 'import' 
                            ? (t("settings.import") || "Import")
                            : (t("settings.reimport") || "Reimport")
                        }
                    </Button>
                ]}
                width="90%"
                style={{ maxWidth: '1200px' }}
            >
                <Card 
                    style={{ 
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: 'none',
                        marginBottom: '24px'
                    }}
                    bodyStyle={{ padding: '20px' }}
                >
                    <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f', marginBottom: '16px' }}>
                        {t("settings.selectImportMode") || "Select Import Mode"}
                    </div>
                    <Radio.Group 
                        value={importMode} 
                        onChange={(e) => setImportMode(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <Radio.Button 
                                value="import"
                                style={{ 
                                    width: '100%',
                                    height: '44px',
                                    lineHeight: '44px',
                                    textAlign: 'center',
                                    fontSize: '17px',
                                    fontWeight: 500,
                                    borderRadius: '12px',
                                    letterSpacing: '-0.022em'
                                }}
                            >
                                {t("settings.importModeAdd") || "Import (Add new only)"}
                            </Radio.Button>
                            <Radio.Button 
                                value="reimport"
                                style={{ 
                                    width: '100%',
                                    height: '44px',
                                    lineHeight: '44px',
                                    textAlign: 'center',
                                    fontSize: '17px',
                                    fontWeight: 500,
                                    borderRadius: '12px',
                                    letterSpacing: '-0.022em'
                                }}
                            >
                                {t("settings.importModeUpdate") || "Reimport (Update/Delete)"}
                            </Radio.Button>
                        </Space>
                    </Radio.Group>
                </Card>
                
                <Card 
                    style={{ 
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: 'none',
                        marginBottom: '24px'
                    }}
                    bodyStyle={{ padding: '20px' }}
                >
                    <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f', marginBottom: '16px' }}>
                        {t("settings.pasteJson") || "Paste JSON"}
                    </div>
                    <Input.TextArea
                        placeholder={t("settings.pasteJsonHere") || "Paste JSON here..."}
                        value={importJsonInput}
                        onChange={handleJsonInput}
                        rows={8}
                        style={{ fontFamily: 'monospace', fontSize: '14px' }}
                    />
                </Card>
                
                {stagingIngredients.length > 0 && (
                    <div>
                        <div style={{ fontSize: '17px', fontWeight: 600, marginBottom: '16px' }}>
                            {t("settings.stagingArea") || "Staging Area"} ({stagingIngredients.length} {t("settings.ingredients") || "ingredients"})
                        </div>
                        <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '8px' }}>
                            <List
                                dataSource={stagingIngredients}
                                renderItem={(ingredient, index) => (
                                    <EditableIngredientItem
                                        key={index}
                                        ingredient={ingredient}
                                        index={index}
                                        onChange={handleIngredientChange}
                                        errors={importValidationErrors[index]}
                                    />
                                )}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
