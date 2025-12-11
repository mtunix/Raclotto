import React, {useState, useEffect} from "react";
import {Form, Input, Switch, Space, message, Spin} from "antd";
import {useTranslation} from "react-i18next";
import {Api} from "../lib/api";
import {useAppStore} from "../AppSlice";

type SettingsViewProps = {};

export function SettingsView(props: SettingsViewProps) {
    let { t } = useTranslation();
    const triggerSettingsRefresh = useAppStore((state) => state.triggerSettingsRefresh);
    
    let options = [
        {"name": "meat", "key": "tags.meat"},
        {"name": "vegetarian", "key": "tags.vegetarian"},
        {"name": "vegan", "key": "tags.vegan"},
        {"name": "histamine", "key": "tags.histamine"},
        {"name": "gluten", "key": "tags.gluten"},
        {"name": "fructose", "key": "tags.fructose"},
        {"name": "lactose", "key": "tags.lactose"},
    ];

    // User settings state
    let [meat, setMeat] = useState(false);
    let [vegetarian, setVegetarian] = useState(true);
    let [vegan, setVegan] = useState(true);
    let [gluten, setGluten] = useState(true);
    let [histamine, setHistamine] = useState(true);
    let [fructose, setFructose] = useState(true);
    let [lactose, setLactose] = useState(true);
    let [name, setName] = useState("");
    let [loading, setLoading] = useState(true);
    let [saving, setSaving] = useState(false);

    useEffect(() => {
        // Load user data from backend
        Api.getCurrentUser().then((userData) => {
            setName(userData.name || "");
            setMeat(userData.meat || false);
            setVegetarian(userData.vegetarian !== undefined ? userData.vegetarian : true);
            setVegan(userData.vegan !== undefined ? userData.vegan : true);
            setGluten(userData.gluten !== undefined ? userData.gluten : true);
            setHistamine(userData.histamine !== undefined ? userData.histamine : true);
            setFructose(userData.fructose !== undefined ? userData.fructose : true);
            setLactose(userData.lactose !== undefined ? userData.lactose : true);
            setLoading(false);
        }).catch((error) => {
            console.error("Failed to load user settings:", error);
            message.error(t("settings.loadFailed") || "Failed to load settings");
            setLoading(false);
        });
    }, [t]);

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
        saveToBackend(type, checked);
    }

    function saveToBackend(field: string, value: boolean) {
        if (saving) return; // Prevent concurrent saves
        
        setSaving(true);
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
            setSaving(false);
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
            setSaving(false);
        });
    }

    function onNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const newName = e.target.value;
        setName(newName);
        
        // Save to backend
        if (saving) return;
        setSaving(true);
        Api.updateCurrentUser({ name: newName }).then(() => {
            setSaving(false);
            // Name change doesn't affect ingredients, but trigger refresh anyway for consistency
            triggerSettingsRefresh();
        }).catch((error) => {
            console.error("Failed to save name:", error);
            message.error(t("settings.saveFailed") || "Failed to save name");
            // Reload from backend
            Api.getCurrentUser().then((userData) => {
                setName(userData.name || "");
            });
            setSaving(false);
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


    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            <Form.Item label={t("settings.iAm")}>
                <Input
                    value={name}
                    onChange={onNameChanged}
                    placeholder={t("common.enterName")}
                    disabled={saving}
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
                            disabled={saving}
                        />
                    ))}
                </Space>
            </Form.Item>
        </div>
    );
}
