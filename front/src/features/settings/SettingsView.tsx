import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Switch,
  Space,
  message,
  Spin,
  Button,
  Tabs,
  Card,
  List,
  Tag,
  Alert,
  ColorPicker,
  Modal,
  Radio,
  Select,
  Row,
  Col,
  Typography,
  Checkbox,
  Slider,
  Divider,
} from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  mutateMe,
  mutateSession,
  mutatePanLists,
  onErrorRetry,
} from "../../lib/api/swrHooks";
import { updateMe, useGetMe } from "../../api/generated/endpoints/auth/auth";
import { exportIngredients } from "../../api/generated/endpoints/ingredients/ingredients";
import {
  closeSession,
  updateSession,
  useGetSessionByKey,
} from "../../api/generated/endpoints/sessions/sessions";
import {
  createInvite,
  revokeInvite,
  useListInvites,
} from "../../api/generated/endpoints/invites/invites";
import { IngredientType } from "../../api/generated/model";
import type { ImportedIngredient, MeDto } from "../../api/generated/model";
import { useAppStore } from "../../AppSlice";
import { useAuthStore } from "../../AuthSlice";
import { UserSettingsSection as UserSettingsSectionComponent } from "./sections/UserSettingsSection";
import { SessionSettingsSection as SessionSettingsSectionComponent } from "./sections/SessionSettingsSection";
import { EventSettingsSection as EventSettingsSectionComponent } from "./sections/EventSettingsSection";
import { InvitesSection as InvitesSectionComponent } from "./sections/InvitesSection";
import { changeLanguage } from "../../i18n";
import { normalizeDiet } from "../../model/diet";
import { useDietPreferences } from "../../shared/useDietPreferences";
import { ingredientCatalog } from "../ingredients/ingredientCatalog";
import {
  categoryProblem,
  isIngredientType,
  stageExportFile,
  StagedIngredient,
  toImported,
} from "./ingredientImport";
import "./SettingsView.css";

const { Text } = Typography;

type SettingsViewProps = {};

type StagedFieldChange = <K extends keyof StagedIngredient>(
  index: number,
  field: K,
  value: StagedIngredient[K],
) => void;

interface EditableIngredientItemProps {
  ingredient: StagedIngredient;
  index: number;
  onChange: StagedFieldChange;
  errors: Record<string, string> | undefined;
}

function EditableIngredientItem({
  ingredient,
  index,
  onChange,
  errors,
}: EditableIngredientItemProps) {
  const { t } = useTranslation();

  return (
    <Card
      className="settings-editable-ingredient-card"
      style={{
        border:
          errors && Object.keys(errors).length > 0
            ? "1px solid #ff4d4f"
            : "1px solid #d9d9d9",
      }}
      bodyStyle={undefined}
    >
      <div className="settings-editable-ingredient-card-body">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              label={t("ingredient.ingredientName") || "Name"}
              validateStatus={errors?.name ? "error" : ""}
              help={errors?.name}
            >
              <Input
                value={ingredient.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                placeholder={t("ingredient.ingredientName") || "Name"}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              label={t("ingredient.type") || "Type"}
              validateStatus={errors?.type ? "error" : ""}
              help={errors?.type}
            >
              <Select
                value={ingredient.type}
                onChange={(value) => onChange(index, "type", value)}
                style={{ width: "100%" }}
              >
                <Select.Option value={IngredientType.FILL}>
                  {t("ingredient.fill") || "FILL"}
                </Select.Option>
                <Select.Option value={IngredientType.SAUCE}>
                  {t("ingredient.sauce") || "SAUCE"}
                </Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label={t("ingredient.available")}>
              <Switch
                checked={ingredient.available}
                onChange={(checked) => onChange(index, "available", checked)}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              label={t("settings.dietaryTags") || "Dietary Tags"}
              validateStatus={errors?.dietary ? "error" : ""}
              help={errors?.dietary}
            >
              <Space wrap>
                <Switch
                  checked={ingredient.meat}
                  onChange={(checked) => {
                    if (checked) {
                      // Uncheck other categories
                      onChange(index, "vegetarian", false);
                      onChange(index, "vegan", false);
                      onChange(index, "fish", false);
                    }
                    onChange(index, "meat", checked);
                  }}
                  checkedChildren={t("tags.meat") || "Meat"}
                  unCheckedChildren={t("tags.meat") || "Meat"}
                />
                <Switch
                  checked={ingredient.vegetarian}
                  onChange={(checked) => {
                    if (checked) {
                      // Uncheck other categories
                      onChange(index, "meat", false);
                      onChange(index, "vegan", false);
                      onChange(index, "fish", false);
                    }
                    onChange(index, "vegetarian", checked);
                  }}
                  checkedChildren={t("tags.vegetarian") || "Vegetarian"}
                  unCheckedChildren={t("tags.vegetarian") || "Vegetarian"}
                />
                <Switch
                  checked={ingredient.vegan}
                  onChange={(checked) => {
                    if (checked) {
                      // Uncheck other categories
                      onChange(index, "meat", false);
                      onChange(index, "vegetarian", false);
                      onChange(index, "fish", false);
                    }
                    onChange(index, "vegan", checked);
                  }}
                  checkedChildren={t("tags.vegan") || "Vegan"}
                  unCheckedChildren={t("tags.vegan") || "Vegan"}
                />
                <Switch
                  checked={ingredient.fish || false}
                  onChange={(checked) => {
                    if (checked) {
                      // Uncheck other categories
                      onChange(index, "meat", false);
                      onChange(index, "vegetarian", false);
                      onChange(index, "vegan", false);
                    }
                    onChange(index, "fish", checked);
                  }}
                  checkedChildren={t("tags.fish") || "Fish"}
                  unCheckedChildren={t("tags.fish") || "Fish"}
                />
                <Switch
                  checked={ingredient.gluten}
                  onChange={(checked) => onChange(index, "gluten", checked)}
                  checkedChildren={t("tags.gluten") || "Gluten"}
                  unCheckedChildren={t("tags.gluten") || "Gluten"}
                />
                <Switch
                  checked={ingredient.histamine}
                  onChange={(checked) => onChange(index, "histamine", checked)}
                  checkedChildren={t("tags.histamine") || "Histamine"}
                  unCheckedChildren={t("tags.histamine") || "Histamine"}
                />
                <Switch
                  checked={ingredient.fructose}
                  onChange={(checked) => onChange(index, "fructose", checked)}
                  checkedChildren={t("tags.fructose") || "Fructose"}
                  unCheckedChildren={t("tags.fructose") || "Fructose"}
                />
                <Switch
                  checked={ingredient.lactose}
                  onChange={(checked) => onChange(index, "lactose", checked)}
                  checkedChildren={t("tags.lactose") || "Lactose"}
                  unCheckedChildren={t("tags.lactose") || "Lactose"}
                />
              </Space>
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              label={
                t("ingredient.additionalProperties") || "Additional Properties"
              }
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <div style={{ marginBottom: "8px" }}>
                    {t("ingredient.spicy") || "Spicy"} ({ingredient.spicy || 0}
                    /3)
                  </div>
                  <Slider
                    min={0}
                    max={3}
                    value={ingredient.spicy || 0}
                    onChange={(value) => onChange(index, "spicy", value)}
                    marks={{ 0: "0", 1: "1", 2: "2", 3: "3" }}
                  />
                </div>
                <Checkbox
                  checked={ingredient.wildcard || false}
                  onChange={(e) =>
                    onChange(index, "wildcard", e.target.checked)
                  }
                >
                  {t("ingredient.wildcard") || "Wildcard"}
                </Checkbox>
                <Checkbox
                  checked={ingredient.sweet || false}
                  onChange={(e) => onChange(index, "sweet", e.target.checked)}
                >
                  {t("ingredient.sweet") || "Sweet"}
                </Checkbox>
              </Space>
            </Form.Item>
          </Col>
        </Row>
      </div>
    </Card>
  );
}

export function SettingsView(props: SettingsViewProps) {
  let { t } = useTranslation();
  const triggerSettingsRefresh = useAppStore(
    (state) => state.triggerSettingsRefresh,
  );
  const session = useAppStore((state) => state.session);
  const sessionKey = session?.key || "";
  const navigate = useNavigate();
  const clearSession = useAppStore((state) => state.clearSession);
  const setSession = useAppStore((state) => state.setSession);

  // Use SWR hooks for data fetching
  const swr = {
    onErrorRetry,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  };
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
  } = useGetMe({ swr });
  const { data: sessionData, isLoading: sessionWaiting } = useGetSessionByKey(
    { session_key: sessionKey },
    { swr: { ...swr, enabled: !!sessionKey } },
  );
  const {
    data: invites = [],
    isLoading: loadingInvites,
    mutate: mutateInvites,
  } = useListInvites({ swr });

  // User settings state
  const {
    prefs: tagValues,
    setPrefs: setDietPrefs,
    setChecked,
  } = useDietPreferences();
  const { meat, vegetarian, vegan, fish, gluten, histamine, fructose, lactose } =
    tagValues;
  let [userName, setUserName] = useState("");
  let [userColor, setUserColor] = useState<string>("#1890ff");
  let [userLanguage, setUserLanguage] = useState<MeDto["language"]>("de");
  let [borderStyle, setBorderStyle] = useState<MeDto["border_style"]>("solid");
  let [borderTexture, setBorderTexture] =
    useState<MeDto["border_texture"]>(null);
  let [glowEffect, setGlowEffect] = useState<boolean>(false);
  let [userSaving, setUserSaving] = useState(false);

  // Track initial state for dirty checking
  const [initialUserState, setInitialUserState] = useState<{
    name: string;
    color: string;
    language: MeDto["language"];
    border_style: MeDto["border_style"];
    border_texture: MeDto["border_texture"];
    glow_effect: boolean;
    meat: boolean;
    vegetarian: boolean;
    vegan: boolean;
    fish: boolean;
    gluten: boolean;
    histamine: boolean;
    fructose: boolean;
    lactose: boolean;
  } | null>(null);

  const setUser = useAuthStore((state) => state.setUser);
  const currentUser = useAuthStore((state) => state.user);

  // Session settings state
  let [sessionName, setSessionName] = useState("");
  let [sessionSaving, setSessionSaving] = useState(false);
  let [exporting, setExporting] = useState(false);
  let [importing, setImporting] = useState(false);
  let [reimporting, setReimporting] = useState(false);
  const [closeSessionModalVisible, setCloseSessionModalVisible] =
    useState(false);

  // Export modal state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportJson, setExportJson] = useState<string>("");

  // Import modal state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importMode, setImportMode] = useState<"import" | "reimport">("import");
  const [stagingIngredients, setStagingIngredients] = useState<
    StagedIngredient[]
  >([]);
  const [importValidationErrors, setImportValidationErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [importJsonInput, setImportJsonInput] = useState<string>("");

  // Invites state
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  let options = [
    { name: "meat", key: "tags.meat" },
    { name: "vegetarian", key: "tags.vegetarian" },
    { name: "vegan", key: "tags.vegan" },
    { name: "fish", key: "tags.fish" },
    { name: "histamine", key: "tags.histamine" },
    { name: "gluten", key: "tags.gluten" },
    { name: "fructose", key: "tags.fructose" },
    { name: "lactose", key: "tags.lactose" },
  ];

  // Update local state when SWR data changes
  useEffect(() => {
    if (userData) {
      const { name, color, language, border_style, border_texture, glow_effect } =
        userData;
      const { meat, vegetarian, vegan, fish, gluten, histamine, fructose, lactose } =
        userData;

      setUserName(name);
      setDietPrefs({
        meat,
        vegetarian,
        vegan,
        fish,
        gluten,
        histamine,
        fructose,
        lactose,
      });
      setUserColor(color);
      setUserLanguage(language);
      setBorderStyle(border_style);
      setBorderTexture(border_texture);
      setGlowEffect(glow_effect);

      // Set initial state for dirty checking
      setInitialUserState({
        name,
        color,
        language,
        border_style,
        border_texture,
        glow_effect,
        meat,
        vegetarian,
        vegan,
        fish,
        gluten,
        histamine,
        fructose,
        lactose,
      });
    }
  }, [userData]);

  useEffect(() => {
    if (userError) {
      message.error(t("settings.loadFailed") || "Failed to load settings");
    }
  }, [userError, t]);

  useEffect(() => {
    if (sessionData) {
      setSessionName(sessionData.name);
    }
  }, [sessionData]);

  // User settings functions
  function onUserNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
    setUserName(e.target.value);
  }

  function onUserColorChanged(color: string) {
    setUserColor(color);
  }

  const isUserSettingsDirty = () => {
    if (!initialUserState) return false;

    return (
      userName !== initialUserState.name ||
      userColor !== initialUserState.color ||
      userLanguage !== initialUserState.language ||
      borderStyle !== initialUserState.border_style ||
      borderTexture !== initialUserState.border_texture ||
      glowEffect !== initialUserState.glow_effect ||
      meat !== initialUserState.meat ||
      vegetarian !== initialUserState.vegetarian ||
      vegan !== initialUserState.vegan ||
      fish !== initialUserState.fish ||
      gluten !== initialUserState.gluten ||
      histamine !== initialUserState.histamine ||
      fructose !== initialUserState.fructose ||
      lactose !== initialUserState.lactose
    );
  };

  const handleSaveUserSettings = async () => {
    if (!isUserSettingsDirty() || userSaving) return;

    setUserSaving(true);

    try {
      // Apply the diet hierarchy the backend enforces (meat -> vegetarian -> vegan)
      const diet = normalizeDiet(tagValues);
      const updateData = {
        name: userName,
        color: userColor,
        language: userLanguage,
        border_style: borderStyle,
        border_texture: borderTexture,
        glow_effect: glowEffect,
        ...diet,
      };

      const me = await updateMe(updateData);

      // Change i18n language if it changed
      if (userLanguage !== initialUserState?.language) {
        changeLanguage(userLanguage);
      }

      // Update initial state
      setInitialUserState({
        name: userName,
        color: userColor,
        language: userLanguage,
        border_style: borderStyle,
        border_texture: borderTexture,
        glow_effect: glowEffect,
        ...diet,
      });

      // Update local state to match what the backend stored
      setDietPrefs(diet);

      // Invalidate cache to trigger refetch
      mutateMe();

      // Pan cards show their author's border preferences
      mutatePanLists();

      setUser(me);

      message.success(t("common.saved") || "Saved");
      triggerSettingsRefresh();
    } catch (error) {
      console.error("Failed to save user settings:", error);
      message.error(t("settings.saveFailed") || "Failed to save settings");
      // Reload from backend to revert changes
      mutateMe();
    } finally {
      setUserSaving(false);
    }
  };

  // Session settings functions
  function onSessionNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
    setSessionName(e.target.value);
  }

  function onSaveSessionName() {
    if (!session || !sessionName.trim()) return;
    setSessionSaving(true);
    updateSession(session.id, { name: sessionName.trim() })
      .then((updatedSession) => {
        setSession(updatedSession);
        // Invalidate cache to trigger refetch
        mutateSession(sessionKey);
        message.success(t("common.saved") || "Saved");
        setSessionSaving(false);
      })
      .catch((error) => {
        console.error("Failed to update session:", error);
        message.error(t("common.saveFailed") || "Failed to save");
        setSessionSaving(false);
      });
  }

  function onCloseSession() {
    setCloseSessionModalVisible(true);
  }

  function handleConfirmCloseSession() {
    if (!sessionKey) return;
    closeSession({ key: sessionKey })
      .then(() => {
        clearSession();
        setCloseSessionModalVisible(false);
        navigate("/");
      })
      .catch((error) => {
        console.error("Failed to close session:", error);
        message.error(t("session.closeFailed") || "Failed to close session");
      });
  }

  // Import/Export functions
  function onExportIngredients() {
    if (!sessionKey) {
      message.error(t("settings.noSession") || "No session selected");
      return;
    }
    setExporting(true);
    exportIngredients({ session_key: sessionKey })
      .then((data) => {
        const jsonString = JSON.stringify(data, null, 2);
        setExportJson(jsonString);
        setExportModalVisible(true);

        // Auto-copy to clipboard
        navigator.clipboard
          .writeText(jsonString)
          .then(() => {
            message.success(
              t("settings.copiedToClipboard") || "Copied to clipboard",
            );
          })
          .catch((err) => {
            console.error("Failed to copy to clipboard:", err);
          });

        setExporting(false);
      })
      .catch((error) => {
        console.error("Failed to export ingredients:", error);
        message.error(
          t("settings.exportFailed") || "Failed to export ingredients",
        );
        setExporting(false);
      });
  }

  function handleCopyExport() {
    navigator.clipboard
      .writeText(exportJson)
      .then(() => {
        message.success(
          t("settings.copiedToClipboard") || "Copied to clipboard",
        );
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
        message.error(
          t("settings.copyFailed") || "Failed to copy to clipboard",
        );
      });
  }

  // Validation functions
  function validateIngredient(
    ingredient: StagedIngredient,
  ): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!ingredient.name || ingredient.name.trim() === "") {
      errors.name =
        t("settings.validationError.nameRequired") || "Name is required";
    }

    if (!isIngredientType(ingredient.type)) {
      errors.type =
        t("settings.validationError.typeRequired") ||
        "Type must be FILL (1) or SAUCE (2)";
    }

    const problem = categoryProblem(ingredient);
    if (problem === "none") {
      errors.dietary =
        t("settings.validationError.dietaryRequired") ||
        "One of meat, vegetarian, vegan or fish must be true";
    } else if (problem === "several") {
      errors.dietary =
        t("settings.validationError.categoryConflict") ||
        "Only one of meat, vegetarian, vegan or fish can be true";
    }

    return errors;
  }

  function validateAllIngredients(): boolean {
    const newErrors: Record<number, Record<string, string>> = {};
    let hasErrors = false;

    stagingIngredients.forEach((ingredient, index) => {
      const errors = validateIngredient(ingredient);
      if (Object.keys(errors).length > 0) {
        newErrors[index] = errors;
        hasErrors = true;
      }
    });

    setImportValidationErrors(newErrors);
    return !hasErrors;
  }

  const handleIngredientChange: StagedFieldChange = (index, field, value) => {
    const updated = [...stagingIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setStagingIngredients(updated);

    // Real-time validation
    const errors = validateIngredient(updated[index]);
    setImportValidationErrors((prev) => {
      const newErrors = { ...prev };
      if (Object.keys(errors).length > 0) {
        newErrors[index] = errors;
      } else {
        delete newErrors[index];
      }
      return newErrors;
    });
  };

  function handleJsonInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setImportJsonInput(text);
    // Invalid JSON while typing clears the staging without an error
    const staged = stageExportFile(text);
    if (staged) {
      setStagingIngredients(staged);
    } else if (text.trim() !== "") {
      setStagingIngredients([]);
    }
  }

  function handleCloseImportModal() {
    setImportModalVisible(false);
    setStagingIngredients([]);
    setImportValidationErrors({});
    setImportJsonInput("");
    setImportMode("import");
  }

  function handleSubmitImport() {
    if (!validateAllIngredients()) {
      message.error(
        t("settings.validationErrors") ||
          "Please fix validation errors before submitting",
      );
      return;
    }

    if (!sessionKey) {
      message.error(t("settings.noSession") || "No session selected");
      return;
    }

    const ingredients: ImportedIngredient[] = [];
    for (const staged of stagingIngredients) {
      const ingredient = toImported(staged, importMode === "reimport");
      // Validation above rejected every type that does not exist.
      if (ingredient === null) return;
      ingredients.push(ingredient);
    }

    const loadingState =
      importMode === "import" ? setImporting : setReimporting;
    loadingState(true);

    const submitted: Promise<string> =
      importMode === "import"
        ? ingredientCatalog
            .import(sessionKey, ingredients)
            .then(
              (result) =>
                t("settings.importSuccess", { count: result.created }) ||
                `Successfully imported ${result.created} ingredients`,
            )
        : ingredientCatalog
            .reimport(sessionKey, ingredients)
            .then(
              (result) =>
                t("settings.reimportSuccess", {
                  created: result.created,
                  updated: result.updated,
                  deleted: result.deleted,
                }) ||
                `Reimported: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`,
            );

    submitted
      .then((success) => {
        message.success(success);
        triggerSettingsRefresh();
        handleCloseImportModal();
        loadingState(false);
      })
      .catch((error) => {
        console.error(`Failed to ${importMode} ingredients:`, error);
        message.error(
          importMode === "import"
            ? t("settings.importFailed") || "Failed to import ingredients"
            : t("settings.reimportFailed") || "Failed to reimport ingredients",
        );
        loadingState(false);
      });
  }

  // Invites functions
  const onInviteFinish = async (values: { email: string }) => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      await createInvite({ email: values.email });
      // Invalidate cache to trigger refetch
      mutateInvites();
      message.success(t("invite.tokenCreated"));
    } catch (err: any) {
      setInviteError(err.message || t("invite.creationFailed"));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevoke = async (inviteId: number) => {
    try {
      await revokeInvite(inviteId);
      // Invalidate cache to trigger refetch
      mutateInvites();
      message.success(t("invite.tokenRevoked"));
    } catch (err: any) {
      setInviteError(err.message || t("invite.revokeFailed"));
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard
      .writeText(token)
      .then(() => {
        message.success(
          t("settings.copiedToClipboard") || "Copied to clipboard",
        );
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
        message.error(
          t("settings.copyFailed") || "Failed to copy to clipboard",
        );
      });
  };

  return (
    <>
      <Tabs
        defaultActiveKey="user"
        items={[
          {
            key: "user",
            label: (
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 500,
                  letterSpacing: "-0.022em",
                }}
              >
                {t("settings.userSettings") || "User Settings"}
              </span>
            ),
            children: (
              <UserSettingsSectionComponent
                t={t}
                userLoading={userLoading}
                userSaving={userSaving}
                userName={userName}
                userColor={userColor}
                userLanguage={userLanguage}
                borderStyle={borderStyle}
                borderTexture={borderTexture}
                glowEffect={glowEffect}
                options={options}
                tagValues={tagValues}
                currentUser={currentUser}
                isUserSettingsDirty={isUserSettingsDirty}
                onUserNameChanged={onUserNameChanged}
                onUserColorChanged={onUserColorChanged}
                setUserLanguage={setUserLanguage}
                setBorderStyle={setBorderStyle}
                setBorderTexture={setBorderTexture}
                setGlowEffect={setGlowEffect}
                setChecked={setChecked}
                handleSaveUserSettings={handleSaveUserSettings}
              />
            ),
          },
          {
            key: "session",
            label: (
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 500,
                  letterSpacing: "-0.022em",
                }}
              >
                {t("settings.sessionSettings") || "Session Settings"}
              </span>
            ),
            children: (
              <SessionSettingsSectionComponent
                t={t}
                sessionWaiting={sessionWaiting}
                sessionName={sessionName}
                session={session}
                sessionSaving={sessionSaving}
                exporting={exporting}
                sessionKey={sessionKey}
                onSessionNameChanged={onSessionNameChanged}
                onSaveSessionName={onSaveSessionName}
                onExportIngredients={onExportIngredients}
                setImportModalVisible={setImportModalVisible}
                onCloseSession={onCloseSession}
              />
            ),
          },
          {
            key: "events",
            label: (
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 500,
                  letterSpacing: "-0.022em",
                }}
              >
                {t("settings.eventSettings") || "Event Settings"}
              </span>
            ),
            children: (
              <EventSettingsSectionComponent
                t={t}
                sessionKey={sessionKey}
                session={session}
              />
            ),
          },
          {
            key: "invites",
            label: (
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 500,
                  letterSpacing: "-0.022em",
                }}
              >
                {t("common.invites") || "Invites"}
              </span>
            ),
            children: (
              <InvitesSectionComponent
                t={t}
                inviteError={inviteError}
                setInviteError={setInviteError}
                inviteLoading={inviteLoading}
                loadingInvites={loadingInvites}
                invites={invites}
                onInviteFinish={onInviteFinish}
                handleCopyToken={handleCopyToken}
                handleRevoke={handleRevoke}
                formatDate={formatDate}
                isExpired={isExpired}
              />
            ),
          },
        ]}
      />

      {/* Export Modal */}
      <Modal
        title={t("settings.exportModalTitle") || "Export Ingredients"}
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={handleCopyExport}>
            {t("settings.copyToClipboard") || "Copy to Clipboard"}
          </Button>,
          <Button key="close" onClick={() => setExportModalVisible(false)}>
            {t("common.close") || "Close"}
          </Button>,
        ]}
        width="80%"
        style={{ maxWidth: "1000px" }}
      >
        <Input.TextArea
          value={exportJson}
          readOnly
          rows={20}
          style={{ fontFamily: "monospace", fontSize: "14px" }}
        />
      </Modal>

      {/* Close Session Confirmation Modal */}
      <Modal
        title={t("session.confirmCloseTitle") || "End Session?"}
        open={closeSessionModalVisible}
        onCancel={() => setCloseSessionModalVisible(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setCloseSessionModalVisible(false)}
          >
            {t("common.cancel") || "Cancel"}
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            onClick={handleConfirmCloseSession}
          >
            {t("session.endSession") || "End Session"}
          </Button>,
        ]}
      >
        <p>
          {t("session.confirmCloseMessage") ||
            "Are you sure you want to end this session? This action cannot be undone."}
        </p>
      </Modal>

      {/* Import Modal */}
      <Modal
        title={t("settings.importModalTitle") || "Import Ingredients"}
        open={importModalVisible}
        onCancel={handleCloseImportModal}
        footer={[
          <Button key="cancel" onClick={handleCloseImportModal}>
            {t("common.cancel") || "Cancel"}
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmitImport}
            disabled={
              stagingIngredients.length === 0 ||
              Object.keys(importValidationErrors).length > 0 ||
              importing ||
              reimporting
            }
            loading={importing || reimporting}
          >
            {importMode === "import"
              ? t("settings.import") || "Import"
              : t("settings.reimport") || "Reimport"}
          </Button>,
        ]}
        width="90%"
        style={{ maxWidth: "1200px" }}
      >
        <Card
          style={{
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            border: "none",
            marginBottom: "24px",
          }}
          bodyStyle={{ padding: "20px" }}
        >
          <div
            style={{
              fontSize: "17px",
              fontWeight: 600,
              letterSpacing: "-0.022em",
              color: "#1d1d1f",
              marginBottom: "16px",
            }}
          >
            {t("settings.selectImportMode") || "Select Import Mode"}
          </div>
          <Radio.Group
            value={importMode}
            onChange={(e) => setImportMode(e.target.value)}
            style={{ width: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Radio.Button
                value="import"
                style={{
                  width: "100%",
                  height: "44px",
                  lineHeight: "44px",
                  textAlign: "center",
                  fontSize: "17px",
                  fontWeight: 500,
                  borderRadius: "12px",
                  letterSpacing: "-0.022em",
                }}
              >
                {t("settings.importModeAdd") || "Import (Add new only)"}
              </Radio.Button>
              <Radio.Button
                value="reimport"
                style={{
                  width: "100%",
                  height: "44px",
                  lineHeight: "44px",
                  textAlign: "center",
                  fontSize: "17px",
                  fontWeight: 500,
                  borderRadius: "12px",
                  letterSpacing: "-0.022em",
                }}
              >
                {t("settings.importModeUpdate") || "Reimport (Update/Delete)"}
              </Radio.Button>
            </Space>
          </Radio.Group>
        </Card>

        <Card
          style={{
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            border: "none",
            marginBottom: "24px",
          }}
          bodyStyle={{ padding: "20px" }}
        >
          <div
            style={{
              fontSize: "17px",
              fontWeight: 600,
              letterSpacing: "-0.022em",
              color: "#1d1d1f",
              marginBottom: "16px",
            }}
          >
            {t("settings.pasteJson") || "Paste JSON"}
          </div>
          <Input.TextArea
            placeholder={t("settings.pasteJsonHere") || "Paste JSON here..."}
            value={importJsonInput}
            onChange={handleJsonInput}
            rows={8}
            style={{ fontFamily: "monospace", fontSize: "14px" }}
          />
        </Card>

        {stagingIngredients.length > 0 && (
          <div>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 600,
                marginBottom: "16px",
              }}
            >
              {t("settings.stagingArea") || "Staging Area"} (
              {stagingIngredients.length}{" "}
              {t("settings.ingredients") || "ingredients"})
            </div>
            <div
              style={{ maxHeight: "500px", overflowY: "auto", padding: "8px" }}
            >
              <List
                dataSource={stagingIngredients}
                renderItem={(ingredient, index) => (
                  <EditableIngredientItem
                    key={index}
                    ingredient={ingredient}
                    index={index}
                    onChange={handleIngredientChange}
                    errors={importValidationErrors[index]}
                  />
                )}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
