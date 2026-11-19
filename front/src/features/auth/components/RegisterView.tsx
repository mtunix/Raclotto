import React, { useState, useEffect } from "react";
import { Form, Input, Button, Card, Alert } from "antd";
import { useLocation, useNavigate } from "react-router";
import {
  lookupInvite,
  register,
  updateMe,
} from "../../../api/generated/endpoints/auth/auth";
import { useAuthStore } from "../../../AuthSlice";
import { useTranslation } from "react-i18next";
import { TagChipGroup } from "../../../shared/TagChipGroup";
import { ProfilePictureManager } from "../../../shared/ProfilePictureManager";
import { mutateMe } from "../../../lib/api/swrHooks";
import { normalizeDiet } from "../../../model/diet";
import { useDietPreferences } from "../../../shared/useDietPreferences";
import { MIN_PASSWORD_LENGTH } from "../../../lib/api/failedRequest";

export function RegisterView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuthStore((state) => state.login);
  const setUser = useAuthStore((state) => state.setUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Dietary preferences state
  const { prefs: tagValues, setChecked } = useDietPreferences();

  const [form] = Form.useForm();
  const [invitePrefilled, setInvitePrefilled] = useState(false);

  // Prefill invite token & email if ?token=... is present in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (!token) {
      return;
    }

    let cancelled = false;

    const fetchInvite = async () => {
      try {
        setLoading(true);
        // The generated client puts path parameters into the URL as they are.
        const invite = await lookupInvite(encodeURIComponent(token));
        if (!cancelled && invite.email) {
          form.setFieldsValue({
            token,
            email: invite.email,
          });
          setInvitePrefilled(true);
          setError(null);
        }
      } catch (err: any) {
        console.error("Failed to load invite by token:", err);
        if (!cancelled) {
          setError(err?.message || t("auth.inviteTokenInvalid"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchInvite();

    return () => {
      cancelled = true;
    };
  }, [location.search, form, t]);

  const options = [
    { name: "meat", key: "tags.meat" },
    { name: "vegetarian", key: "tags.vegetarian" },
    { name: "vegan", key: "tags.vegan" },
    { name: "fish", key: "tags.fish" },
    { name: "histamine", key: "tags.histamine" },
    { name: "gluten", key: "tags.gluten" },
    { name: "fructose", key: "tags.fructose" },
    { name: "lactose", key: "tags.lactose" },
  ];

  const onFinish = async (values: {
    token: string;
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { token, user } = await register({
        token: values.token,
        email: values.email,
        name: values.name,
        password: values.password,
        ...(profilePicture ? { profile_picture: profilePicture } : {}),
      });
      signIn(token, user);

      // Registration takes no diet; the new user's preferences are saved right after
      try {
        setUser(await updateMe(normalizeDiet(tagValues)));
        mutateMe();
      } catch (e) {
        console.error("Failed to save dietary preferences:", e);
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || t("auth.registrationFailed"));
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
      <Card title={t("auth.register")} style={{ width: "100%", maxWidth: 420 }}>
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
          name="register"
          form={form}
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label={t("auth.inviteToken")}
            name="token"
            rules={[{ required: true, message: t("auth.inviteTokenRequired") }]}
            style={{ marginBottom: 24 }}
          >
            <Input
              size="large"
              placeholder={t("auth.inviteTokenPlaceholder")}
              disabled={invitePrefilled}
            />
          </Form.Item>

          <Form.Item
            label={t("auth.email")}
            name="email"
            rules={[
              { required: true, message: t("auth.emailRequired") },
              { type: "email", message: t("auth.emailInvalid") },
            ]}
            style={{ marginBottom: 24 }}
          >
            <Input
              size="large"
              placeholder={t("auth.emailPlaceholder")}
              disabled={invitePrefilled}
            />
          </Form.Item>

          <Form.Item
            label={t("auth.name")}
            name="name"
            rules={[{ required: true, message: t("auth.nameRequired") }]}
            style={{ marginBottom: 24 }}
          >
            <Input size="large" placeholder={t("auth.namePlaceholder")} />
          </Form.Item>

          <Form.Item
            label={t("auth.password")}
            name="password"
            rules={[
              { required: true, message: t("auth.passwordRequired") },
              { min: MIN_PASSWORD_LENGTH, message: t("auth.passwordTooShort", { count: MIN_PASSWORD_LENGTH }) },
            ]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              size="large"
              placeholder={t("auth.passwordPlaceholder")}
            />
          </Form.Item>

          <Form.Item
            label={t("auth.confirmPassword")}
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: t("auth.confirmPasswordRequired") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(t("auth.passwordsDoNotMatch")),
                  );
                },
              }),
            ]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              size="large"
              placeholder={t("auth.confirmPasswordPlaceholder")}
            />
          </Form.Item>

          <Form.Item
            label={t("auth.profilePicture")}
            style={{ marginBottom: 24 }}
          >
            <ProfilePictureManager
              currentPicture={profilePicture}
              onPictureChange={setProfilePicture}
              disabled={loading}
              size={120}
              showLabel={false}
              directMode={true}
              hideAvatar={true}
            />
          </Form.Item>

          <Form.Item
            label={t("settings.allOkToSnack")}
            style={{ marginBottom: 24 }}
          >
            <TagChipGroup
              options={options}
              values={tagValues}
              onChange={setChecked}
              disabled={loading}
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
              {t("auth.register")}
            </Button>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="link"
              block
              size="large"
              onClick={() => navigate("/login")}
              style={{ padding: "12px 0" }}
            >
              {t("auth.haveAccount")} {t("auth.login")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
