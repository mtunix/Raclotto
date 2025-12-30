import React, { useState, useRef, useMemo, useEffect } from "react";
import { Form, Input, Button, Card, Alert, Space, Avatar } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { Api } from "../../../lib/api";
import { useAuthStore } from "../../../AuthSlice";
import { useTranslation } from "react-i18next";
import { TagChipGroup } from "../../../shared/TagChipGroup";
import { ProfilePictureManager } from "../../../shared/ProfilePictureManager";

export function RegisterView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Dietary preferences state
  const [meat, setMeat] = useState(false);
  const [vegetarian, setVegetarian] = useState(true);
  const [vegan, setVegan] = useState(true);
  const [fish, setFish] = useState(false);
  const [gluten, setGluten] = useState(true);
  const [histamine, setHistamine] = useState(true);
  const [fructose, setFructose] = useState(true);
  const [lactose, setLactose] = useState(true);

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
        const invite = await Api.getInviteByToken(token);
        if (!cancelled && invite && invite.token && invite.email) {
          form.setFieldsValue({
            token: invite.token,
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

  function getValue(type: string): boolean {
    switch (type) {
      case "meat":
        return meat;
      case "vegetarian":
        return vegetarian;
      case "vegan":
        return vegan;
      case "gluten":
        return gluten;
      case "histamine":
        return histamine;
      case "fructose":
        return fructose;
      case "lactose":
        return lactose;
      default:
        return false;
    }
  }

  const tagValues = useMemo(
    () => ({
      meat,
      vegetarian,
      vegan,
      fish,
      gluten,
      histamine,
      fructose,
      lactose,
    }),
    [meat, vegetarian, vegan, fish, gluten, histamine, fructose, lactose],
  );

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
      const result = await Api.register(
        values.token,
        values.email,
        values.name,
        values.password,
        profilePicture || undefined,
      );
      const userId = result.user.id || 0;

      // Store token and userId only
      login(result.token, userId);

      // Fetch full user data and update dietary preferences
      try {
        const user = await Api.getCurrentUser();
        const userLanguage = user.language || "de";
        // Update dietary preferences
        const updateData: any = {
          meat: meat,
          vegetarian: vegetarian,
          vegan: vegan,
          fish: fish,
          histamine: histamine,
          fructose: fructose,
          lactose: lactose,
          gluten: gluten,
          language: userLanguage,
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

        // Fetch updated user data
        const fetchUser = useAuthStore.getState().fetchUser;
        await fetchUser();
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
            rules={[{ required: true, message: t("auth.passwordRequired") }]}
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
