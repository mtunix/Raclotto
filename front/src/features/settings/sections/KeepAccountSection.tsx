import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography, message } from "antd";
import { useTranslation } from "react-i18next";
import { claimAccount } from "../../../api/generated/endpoints/auth/auth";
import { useAuthStore } from "../../../AuthSlice";
import { failureMessage, MIN_PASSWORD_LENGTH } from "../../../lib/api/failedRequest";
import { mutateMe } from "../../../lib/api/swrHooks";
import "../SettingsView.css";

interface KeepAccountForm {
    email?: string;
    password: string;
    confirm_password: string;
}

/** A guest has no password and can't sign in again; setting one keeps the account, XP and all. */
export function KeepAccountSection() {
    const { t } = useTranslation();
    const [form] = Form.useForm<KeepAccountForm>();
    const setUser = useAuthStore((state) => state.setUser);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function onFinish({ email, password }: KeepAccountForm) {
        setSaving(true);
        setError(null);
        void claimAccount({ password, ...(email ? { email } : {}) })
            .then((me) => {
                setUser(me);
                void mutateMe();
                message.success(t("guest.kept"));
            })
            .catch((e: unknown) => {
                setError(failureMessage(e, t, t("common.saveFailed")));
            })
            .finally(() => setSaving(false));
    }

    return (
        <Card
            title={<span className="settings-section-title">{t("guest.keepAccount")}</span>}
            className="settings-card mt-24"
        >
            <Typography.Paragraph type="secondary">{t("guest.keepAccountExplanation")}</Typography.Paragraph>
            {error && (
                <Alert title={error} type="error" showIcon closable={{ onClose: () => setError(null) }} className="mb-16" />
            )}
            <Form form={form} layout="vertical" onFinish={onFinish} disabled={saving}>
                <Form.Item
                    label={t("auth.email")}
                    name="email"
                    rules={[{ type: "email", message: t("auth.emailInvalid") }]}
                    extra={t("auth.emailOptional")}
                >
                    <Input size="large" autoComplete="email" />
                </Form.Item>
                <Form.Item
                    label={t("auth.password")}
                    name="password"
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
                    dependencies={["password"]}
                    rules={[
                        { required: true, message: t("auth.confirmPasswordRequired") },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                return !value || getFieldValue("password") === value
                                    ? Promise.resolve()
                                    : Promise.reject(new Error(t("auth.passwordsDoNotMatch")));
                            },
                        }),
                    ]}
                >
                    <Input.Password size="large" autoComplete="new-password" />
                </Form.Item>
                <Button type="primary" htmlType="submit" size="large" loading={saving}>
                    {t("guest.keepAccountButton")}
                </Button>
            </Form>
        </Card>
    );
}
