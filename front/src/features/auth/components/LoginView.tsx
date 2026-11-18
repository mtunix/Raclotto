import React, { useState } from "react";
import { Form, Input, Button, Card, Alert, Space } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { Api } from "../../../lib/api";
import { useAuthStore } from "../../../AuthSlice";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../../i18n";

export function LoginView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await Api.login(values.email, values.password);
      console.log(result);
      const userId = result.user.id;

      // Ensure userId is available before logging in
      if (!userId) {
        throw new Error("User ID not provided by server");
      }

      // Store token and userId only
      login(result.token, userId);

      // Fetch full user data
      try {
        const fetchUser = useAuthStore.getState().fetchUser;
        await fetchUser();
        const user = useAuthStore.getState().user;
        const userLanguage = user?.language || "de";
        // Change i18n language to user's preference
        changeLanguage(userLanguage);
      } catch (e) {
        console.error("Failed to fetch user data:", e);
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
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
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
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
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
