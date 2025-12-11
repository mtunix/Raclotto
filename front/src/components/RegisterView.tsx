import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert } from 'antd';
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
                meat: false,
                vegetarian: true,
                vegan: true,
                histamine: true,
                fructose: true,
                lactose: true,
                gluten: true,
            });
            // Fetch full user data
            try {
                const user = await Api.getCurrentUser();
                login(result.token, {
                    id: user.id || 0,
                    name: user.name,
                    email: user.email,
                    meat: user.meat || false,
                    vegetarian: user.vegetarian !== undefined ? user.vegetarian : true,
                    vegan: user.vegan !== undefined ? user.vegan : true,
                    histamine: user.histamine !== undefined ? user.histamine : true,
                    fructose: user.fructose !== undefined ? user.fructose : true,
                    lactose: user.lactose !== undefined ? user.lactose : true,
                    gluten: user.gluten !== undefined ? user.gluten : true,
                });
            } catch (e) {
                console.error("Failed to fetch user data:", e);
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
