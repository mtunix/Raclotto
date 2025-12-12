import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Switch, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Api } from '../lib/api';
import { useAuthStore } from '../AuthSlice';
import { useTranslation } from 'react-i18next';

export function RegisterView() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Dietary preferences state
    const [meat, setMeat] = useState(false);
    const [vegetarian, setVegetarian] = useState(true);
    const [vegan, setVegan] = useState(true);
    const [gluten, setGluten] = useState(true);
    const [histamine, setHistamine] = useState(true);
    const [fructose, setFructose] = useState(true);
    const [lactose, setLactose] = useState(true);
    
    const options = [
        {"name": "meat", "key": "tags.meat"},
        {"name": "vegetarian", "key": "tags.vegetarian"},
        {"name": "vegan", "key": "tags.vegan"},
        {"name": "histamine", "key": "tags.histamine"},
        {"name": "gluten", "key": "tags.gluten"},
        {"name": "fructose", "key": "tags.fructose"},
        {"name": "lactose", "key": "tags.lactose"},
    ];

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

    const onFinish = async (values: { token: string; email: string; name: string; password: string; confirmPassword: string }) => {
        if (values.password !== values.confirmPassword) {
            setError(t("auth.passwordsDoNotMatch"));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await Api.register(values.token, values.email, values.name, values.password);
            login(result.token, {
                id: 0, // Will be updated by /auth/me
                name: result.user.name,
                email: result.user.email,
                meat: meat,
                vegetarian: vegetarian,
                vegan: vegan,
                histamine: histamine,
                fructose: fructose,
                lactose: lactose,
                gluten: gluten,
            });
            // Fetch full user data and update dietary preferences
            try {
                const user = await Api.getCurrentUser();
                // Update dietary preferences
                const updateData: any = {
                    meat: meat,
                    vegetarian: vegetarian,
                    vegan: vegan,
                    histamine: histamine,
                    fructose: fructose,
                    lactose: lactose,
                    gluten: gluten,
                };
                // Handle hierarchical logic: if meat is unchecked, ensure vegetarian and vegan are true
                if (!meat) {
                    updateData.vegetarian = true;
                    updateData.vegan = true;
                }
                // If vegetarian is unchecked, ensure vegan is true
                if (!vegetarian) {
                    updateData.vegan = true;
                }
                await Api.updateCurrentUser(updateData);
                
                // Reload user data to get updated values
                const updatedUser = await Api.getCurrentUser();
                login(result.token, {
                    id: updatedUser.id || 0,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    meat: updatedUser.meat || false,
                    vegetarian: updatedUser.vegetarian !== undefined ? updatedUser.vegetarian : true,
                    vegan: updatedUser.vegan !== undefined ? updatedUser.vegan : true,
                    histamine: updatedUser.histamine !== undefined ? updatedUser.histamine : true,
                    fructose: updatedUser.fructose !== undefined ? updatedUser.fructose : true,
                    lactose: updatedUser.lactose !== undefined ? updatedUser.lactose : true,
                    gluten: updatedUser.gluten !== undefined ? updatedUser.gluten : true,
                });
            } catch (e) {
                console.error("Failed to fetch or update user data:", e);
            }
            navigate("/");
        } catch (err: any) {
            setError(err.message || t("auth.registrationFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Card title={t("auth.register")} style={{ width: 400 }}>
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError(null)}
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Form
                    name="register"
                    onFinish={onFinish}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label={t("auth.inviteToken")}
                        name="token"
                        rules={[{ required: true, message: t("auth.inviteTokenRequired") }]}
                    >
                        <Input placeholder={t("auth.inviteTokenPlaceholder")} />
                    </Form.Item>

                    <Form.Item
                        label={t("auth.email")}
                        name="email"
                        rules={[
                            { required: true, message: t("auth.emailRequired") },
                            { type: 'email', message: t("auth.emailInvalid") }
                        ]}
                    >
                        <Input placeholder={t("auth.emailPlaceholder")} />
                    </Form.Item>

                    <Form.Item
                        label={t("auth.name")}
                        name="name"
                        rules={[{ required: true, message: t("auth.nameRequired") }]}
                    >
                        <Input placeholder={t("auth.namePlaceholder")} />
                    </Form.Item>

                    <Form.Item
                        label={t("auth.password")}
                        name="password"
                        rules={[{ required: true, message: t("auth.passwordRequired") }]}
                    >
                        <Input.Password placeholder={t("auth.passwordPlaceholder")} />
                    </Form.Item>

                    <Form.Item
                        label={t("auth.confirmPassword")}
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: t("auth.confirmPasswordRequired") },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(t("auth.passwordsDoNotMatch")));
                                },
                            }),
                        ]}
                    >
                        <Input.Password placeholder={t("auth.confirmPasswordPlaceholder")} />
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
                                    disabled={loading}
                                />
                            ))}
                        </Space>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            {t("auth.register")}
                        </Button>
                    </Form.Item>

                    <Form.Item>
                        <Button type="link" block onClick={() => navigate("/login")}>
                            {t("auth.haveAccount")} {t("auth.login")}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
