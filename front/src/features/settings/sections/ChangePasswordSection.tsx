import { useState } from "react";
import { Alert, Button, Card, Form, Input, message } from "antd";
import { useTranslation } from "react-i18next";
import { changePassword } from "../../../api/generated/endpoints/auth/auth";
import { useAuthStore } from "../../../AuthSlice";
import { failedStatus, MIN_PASSWORD_LENGTH } from "../../../lib/api/failedRequest";
import "../SettingsView.css";

interface PasswordForm {
    current_password: string;
    new_password: string;
    confirm_password: string;
}

/** Changing the password signs out every other device; this one keeps going on the new token. */
export function ChangePasswordSection() {
    const { t } = useTranslation();
    const [form] = Form.useForm<PasswordForm>();
    const setToken = useAuthStore((state) => state.setToken);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function onFinish({ current_password, new_password }: PasswordForm) {
        setSaving(true);
        setError(null);
        void changePassword({ current_password, new_password })
            .then(({ token }) => {
                setToken(token);
                form.resetFields();
                message.success(t("settings.passwordChanged"));
            })
            .catch((e: unknown) => {
                setError(failedStatus(e) === 400 ? t("settings.wrongPassword") : t("common.saveFailed"));
            })
            .finally(() => setSaving(false));
    }

    return (
        <Card
            title={<span className="settings-section-title">{t("settings.changePassword")}</span>}
            className="settings-card mt-24"
        >
            {error && (
                <Alert title={error} type="error" showIcon closable={{ onClose: () => setError(null) }} className="mb-16" />
            )}
            <Form form={form} layout="vertical" onFinish={onFinish} disabled={saving}>
                <Form.Item
                    label={t("settings.currentPassword")}
                    name="current_password"
                    rules={[{ required: true, message: t("auth.passwordRequired") }]}
                >
                    <Input.Password size="large" autoComplete="current-password" />
                </Form.Item>
                <Form.Item
                    label={t("settings.newPassword")}
                    name="new_password"
                    rules={[
                        { required: true, message: t("auth.passwordRequired") },
                        { min: MIN_PASSWORD_LENGTH, message: t("auth.passwordTooShort", { count: MIN_PASSWORD_LENGTH }) },
                    ]}
                >
                    <Input.Password size="large" autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                    label={t("auth.confirmPassword")}
                    name="confirm_password"
                    dependencies={["new_password"]}
                    rules={[
                        { required: true, message: t("auth.confirmPasswordRequired") },
                        ({ getFieldValue }) => ({
                            validator: (_, value) =>
                                !value || value === getFieldValue("new_password")
                                    ? Promise.resolve()
                                    : Promise.reject(new Error(t("auth.passwordsDoNotMatch"))),
                        }),
                    ]}
                >
                    <Input.Password size="large" autoComplete="new-password" />
                </Form.Item>
                <div className="settings-help-text mb-16">
                    {t("settings.changePasswordInfo")}
                </div>
                <Button type="primary" htmlType="submit" size="large" block loading={saving}>
                    {t("settings.changePassword")}
                </Button>
            </Form>
        </Card>
    );
}
