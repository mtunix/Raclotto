import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { joinAsGuest, lookupJoinCode, updateMe } from "../../../api/generated/endpoints/auth/auth";
import type { JoinLookupDto } from "../../../api/generated/model";
import { useAppStore } from "../../../AppSlice";
import { useAuthStore } from "../../../AuthSlice";
import { failedStatus, failureMessage } from "../../../lib/api/failedRequest";
import { mutateMe } from "../../../lib/api/swrHooks";
import { normalizeDiet } from "../../../model/diet";
import { SpinnerContainer } from "../../../shared/Spinner/Spinner";
import { TagChipGroup } from "../../../shared/TagChipGroup";
import { useDietPreferences } from "../../../shared/useDietPreferences";
import "./auth.css";

const DIET_OPTIONS = [
  { name: "meat", key: "tags.meat" },
  { name: "vegetarian", key: "tags.vegetarian" },
  { name: "vegan", key: "tags.vegan" },
  { name: "fish", key: "tags.fish" },
  { name: "histamine", key: "tags.histamine" },
  { name: "gluten", key: "tags.gluten" },
  { name: "fructose", key: "tags.fructose" },
  { name: "lactose", key: "tags.lactose" },
];

type Lookup = { state: "loading" } | { state: "invalid" } | { state: "found"; session: JoinLookupDto };

/** Where a session's join link leads: guests join with a name, signed-in users go straight to the session. */
export function JoinView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code = "" } = useParams<{ code: string }>();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const signIn = useAuthStore((state) => state.login);
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAppStore((state) => state.setSession);
  const { prefs, setChecked } = useDietPreferences();
  const [lookup, setLookup] = useState<Lookup>({ state: "loading" });
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // The generated client puts path parameters into the URL as they are.
    void lookupJoinCode(encodeURIComponent(code))
      .then((session) => {
        if (cancelled) return;
        if (isAuthenticated && session.active) {
          void navigate(`/${session.session_id}/generate`, { replace: true });
          return;
        }
        setLookup({ state: "found", session });
      })
      .catch(() => {
        if (!cancelled) setLookup({ state: "invalid" });
      });
    return () => {
      cancelled = true;
    };
  }, [code, isAuthenticated, navigate]);

  function onFinish({ name }: { name: string }) {
    setJoining(true);
    setError(null);
    void joinAsGuest({ join_code: code, name: name.trim() })
      .then(async ({ token, user, session }) => {
        signIn(token, user);
        setSession(session);
        // Joining takes no diet; the guest's is saved right after, as registering does.
        await updateMe(normalizeDiet(prefs))
          .then((updated) => {
            setUser(updated);
            void mutateMe();
          })
          .catch((e: unknown) => {
            console.error("Failed to save dietary preferences:", e);
          });
        void navigate(`/${session.id}/generate`);
      })
      .catch((e: unknown) => {
        setError(
          failedStatus(e) === 429 ? t("auth.tooManyAttempts") : failureMessage(e, t, t("join.failed")),
        );
      })
      .finally(() => setJoining(false));
  }

  if (lookup.state === "loading") {
    return <SpinnerContainer />;
  }

  const signInInstead = (
    <Button
      type="link"
      block
      size="large"
      onClick={() => navigate(`/login?next=${encodeURIComponent(`/join/${code}`)}`)}
      className="auth-switch"
    >
      {t("join.haveAccount")}
    </Button>
  );

  if (lookup.state === "invalid" || !lookup.session.active) {
    return (
      <div className="auth-page">
        <Card title={t("join.title")} className="auth-card">
          <Alert
            type={lookup.state === "invalid" ? "error" : "info"}
            showIcon
            title={lookup.state === "invalid" ? t("join.invalidLink") : t("join.closedSession")}
            className="mb-16"
          />
          {signInInstead}
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Card title={t("join.titleSession", { name: lookup.session.session_name })} className="auth-card">
        <Typography.Paragraph type="secondary">{t("join.explanation")}</Typography.Paragraph>
        {error && (
          <Alert title={error} type="error" showIcon closable={{ onClose: () => setError(null) }} className="mb-24" />
        )}
        <Form name="join" layout="vertical" autoComplete="off" onFinish={onFinish} disabled={joining}>
          <Form.Item
            label={t("auth.name")}
            name="name"
            rules={[{ required: true, whitespace: true, message: t("auth.nameRequired") }]}
            className="mb-24"
          >
            <Input size="large" placeholder={t("auth.namePlaceholder")} />
          </Form.Item>
          <Form.Item label={t("settings.allOkToSnack")} className="mb-24">
            <TagChipGroup options={DIET_OPTIONS} values={prefs} onChange={setChecked} disabled={joining} />
          </Form.Item>
          <Form.Item className="mb-16">
            <Button type="primary" htmlType="submit" block size="large" loading={joining}>
              {t("join.join")}
            </Button>
          </Form.Item>
        </Form>
        {signInInstead}
      </Card>
    </div>
  );
}
