import { useState, type ChangeEvent } from "react";
import { Button, Card, Input, message, Modal, Radio, Space } from "antd";
import { useTranslation } from "react-i18next";
import type { ImportedIngredient } from "../../../api/generated/model";
import { categoryProblem, ingredientCatalog } from "../../ingredients/ingredientCatalog";
import { isIngredientType, stageExportFile, type StagedIngredient, toImported } from "../ingredientImport";
import { type StagedFieldChange, StagedIngredientCard } from "./StagedIngredientCard";
import "../SettingsView.css";

type ImportMode = "import" | "reimport";

interface ImportIngredientsModalProps {
    open: boolean;
    sessionKey: string;
    onClose: () => void;
}

/** Paste an export file, review and edit its ingredients, then add them (import) or make them the catalog (reimport). */
export function ImportIngredientsModal({ open, sessionKey, onClose }: ImportIngredientsModalProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<ImportMode>("import");
    const [json, setJson] = useState("");
    const [staged, setStaged] = useState<StagedIngredient[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const errors: Record<number, Record<string, string>> = {};
    staged.forEach((ingredient, index) => {
        const problems: Record<string, string> = {};
        if (!ingredient.name.trim()) {
            problems.name = t("settings.validationError.nameRequired");
        }
        if (!isIngredientType(ingredient.type)) {
            problems.type = t("settings.validationError.typeRequired");
        }
        const problem = categoryProblem(ingredient);
        if (problem === "none") {
            problems.dietary = t("settings.validationError.dietaryRequired");
        } else if (problem === "several") {
            problems.dietary = t("settings.validationError.categoryConflict");
        }
        if (Object.keys(problems).length > 0) errors[index] = problems;
    });
    const valid = Object.keys(errors).length === 0;

    const changeField: StagedFieldChange = (index, field, value) => {
        setStaged((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    };

    function onJsonChanged(e: ChangeEvent<HTMLTextAreaElement>) {
        const text = e.target.value;
        setJson(text);
        // Invalid JSON while typing clears the staging without an error.
        const parsed = stageExportFile(text);
        if (parsed) {
            setStaged(parsed);
        } else if (text.trim() !== "") {
            setStaged([]);
        }
    }

    function close() {
        setMode("import");
        setJson("");
        setStaged([]);
        onClose();
    }

    function submit() {
        const ingredients: ImportedIngredient[] = [];
        for (const item of staged) {
            const ingredient = toImported(item, mode === "reimport");
            // Validation already reports every type that does not exist.
            if (ingredient === null) return;
            ingredients.push(ingredient);
        }
        setSubmitting(true);
        const sent =
            mode === "import"
                ? ingredientCatalog.import(sessionKey, ingredients).then((result) => {
                      message.success(t("settings.importSuccess", { count: result.created }));
                  })
                : ingredientCatalog.reimport(sessionKey, ingredients).then((result) => {
                      message.success(
                          t("settings.reimportSuccess", { created: result.created, updated: result.updated, unavailable: result.deleted }),
                      );
                  });
        void sent
            .then(close)
            .catch((e: unknown) => {
                console.error(`Failed to ${mode} ingredients:`, e);
                message.error(
                    mode === "import"
                        ? t("settings.importFailed")
                        : t("settings.reimportFailed"),
                );
            })
            .finally(() => setSubmitting(false));
    }

    return (
        <Modal
            title={t("settings.importModalTitle")}
            open={open}
            onCancel={close}
            footer={[
                <Button key="cancel" onClick={close}>
                    {t("common.cancel")}
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    onClick={submit}
                    disabled={staged.length === 0 || !valid || submitting}
                    loading={submitting}
                >
                    {mode === "import" ? t("settings.import") : t("settings.reimport")}
                </Button>,
            ]}
            width="90%"
            className="settings-import-modal"
        >
            <Card className="settings-import-card" classNames={{ body: "settings-import-card-body" }}>
                <div className="settings-section-title mb-16">{t("settings.selectImportMode")}</div>
                <Radio.Group value={mode} onChange={(e) => setMode(e.target.value as ImportMode)} className="full-width">
                    <Space orientation="vertical" className="full-width" size="middle">
                        <Radio.Button value="import" className="settings-import-mode">
                            {t("settings.importModeAdd")}
                        </Radio.Button>
                        <Radio.Button value="reimport" className="settings-import-mode">
                            {t("settings.importModeUpdate")}
                        </Radio.Button>
                    </Space>
                </Radio.Group>
            </Card>

            <Card className="settings-import-card" classNames={{ body: "settings-import-card-body" }}>
                <div className="settings-section-title mb-16">{t("settings.pasteJson")}</div>
                <Input.TextArea
                    placeholder={t("settings.pasteJsonHere")}
                    value={json}
                    onChange={onJsonChanged}
                    rows={8}
                    className="settings-export"
                />
            </Card>

            {staged.length > 0 && (
                <div>
                    <div className="settings-import-preview-title">
                        {t("settings.stagingArea")} ({staged.length} {t("settings.ingredients")})
                    </div>
                    <div className="settings-import-preview">
                        {staged.map((ingredient, index) => (
                            <StagedIngredientCard
                                // eslint-disable-next-line @eslint-react/no-array-index-key -- staged rows have no id until imported, and are never reordered
                                key={index}
                                ingredient={ingredient}
                                index={index}
                                onChange={changeField}
                                errors={errors[index]}
                            />
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
}
