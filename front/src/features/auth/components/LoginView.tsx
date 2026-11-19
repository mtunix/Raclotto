import { useState } from "react";
import { Form, Input, Button, Card, Alert } from "antd";
import { useNavigate } from "react-router";
import { login } from "../../../api/generated/endpoints/auth/auth";
import { UnauthorizedError } from "../../../lib/api/transport";
import { failedStatus } from "../../../lib/api/failedRequest";
import { useAuthStore } from "../../../AuthSlice";
import { useTranslation } from "react-i18next";

export function LoginView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await login({
        name_or_email: values.email,
        password: values.password,
      });
      signIn(token, user);
      void navigate("/");
    } catch (err: unknown) {
      setError(
        err instanceof UnauthorizedError
          ? t("auth.invalidCredentials")
          : failedStatus(err) === 429
            ? t("auth.tooManyAttempts")
            : err instanceof Error && err.message
            ? err.message
            : t("auth.loginFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        padding: "40px 24px",
      }}
    >
      <Card title={t("auth.login")} style={{ width: "100%", maxWidth: 420 }}>
        {error && (
          <Alert
            title={error}
            type="error"
            showIcon
            closable={{ onClose: () => setError(null) }}
            style={{ marginBottom: 24 }}
          />
        )}
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label={t("auth.emailOrName")}
            name="email"
            rules={[{ required: true, message: t("auth.emailOrNameRequired") }]}
            style={{ marginBottom: 24 }}
          >
            <Input
              size="large"
              placeholder={t("auth.emailOrNamePlaceholder")}
            />
          </Form.Item>

          <Form.Item
            label={t("auth.password")}
            name="password"
            rules={[{ required: true, message: t("auth.passwordRequired") }]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              size="large"
              placeholder={t("auth.passwordPlaceholder")}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              {t("auth.login")}
            </Button>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="link"
              block
              size="large"
              onClick={() => navigate("/register")}
              style={{ padding: "12px 0" }}
            >
              {t("auth.noAccount")} {t("auth.register")}
            </Button>
            <Button type="link" block onClick={() => navigate("/rules")}>
              {t("rules.newHere")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
