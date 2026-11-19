import { useMemo, useState, type CSSProperties, type ChangeEvent } from "react";
import { Button, Card, Input, message, Modal, Radio, Space } from "antd";
import { useTranslation } from "react-i18next";
import type { ImportedIngredient } from "../../../api/generated/model";
import { ingredientCatalog } from "../../ingredients/ingredientCatalog";
import { categoryProblem, isIngredientType, stageExportFile, type StagedIngredient, toImported } from "../ingredientImport";
import { type StagedFieldChange, StagedIngredientCard } from "./StagedIngredientCard";
import "../SettingsView.css";

type ImportMode = "import" | "reimport";

const cardStyle: CSSProperties = {
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    border: "none",
    marginBottom: "24px",
};
const cardTitleStyle: CSSProperties = {
    fontSize: "17px",
    fontWeight: 600,
    letterSpacing: "-0.022em",
    color: "#1d1d1f",
    marginBottom: "16px",
};
const modeButtonStyle: CSSProperties = {
    width: "100%",
    height: "44px",
    lineHeight: "44px",
    textAlign: "center",
    fontSize: "17px",
    fontWeight: 500,
    borderRadius: "12px",
    letterSpacing: "-0.022em",
};

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

    const errors = useMemo(() => {
        const found: Record<number, Record<string, string>> = {};
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
            if (Object.keys(problems).length > 0) found[index] = problems;
        });
        return found;
    }, [staged, t]);
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

    async function submit() {
        const ingredients: ImportedIngredient[] = [];
        for (const item of staged) {
            const ingredient = toImported(item, mode === "reimport");
            // Validation already reports every type that does not exist.
            if (ingredient === null) return;
            ingredients.push(ingredient);
        }
        setSubmitting(true);
        try {
            if (mode === "import") {
                const result = await ingredientCatalog.import(sessionKey, ingredients);
                message.success(t("settings.importSuccess", { count: result.created }));
            } else {
                const result = await ingredientCatalog.reimport(sessionKey, ingredients);
                message.success(
                    t("settings.reimportSuccess", { created: result.created, updated: result.updated, unavailable: result.deleted }),
                );
            }
            close();
        } catch (e) {
            console.error(`Failed to ${mode} ingredients:`, e);
            message.error(
                mode === "import"
                    ? t("settings.importFailed")
                    : t("settings.reimportFailed"),
            );
        } finally {
            setSubmitting(false);
        }
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
            style={{ maxWidth: "1200px" }}
        >
            <Card style={cardStyle} styles={{ body: { padding: "20px" } }}>
                <div style={cardTitleStyle}>{t("settings.selectImportMode")}</div>
                <Radio.Group value={mode} onChange={(e) => setMode(e.target.value as ImportMode)} style={{ width: "100%" }}>
                    <Space orientation="vertical" style={{ width: "100%" }} size="middle">
                        <Radio.Button value="import" style={modeButtonStyle}>
                            {t("settings.importModeAdd")}
                        </Radio.Button>
                        <Radio.Button value="reimport" style={modeButtonStyle}>
                            {t("settings.importModeUpdate")}
                        </Radio.Button>
                    </Space>
                </Radio.Group>
            </Card>

            <Card style={cardStyle} styles={{ body: { padding: "20px" } }}>
                <div style={cardTitleStyle}>{t("settings.pasteJson")}</div>
                <Input.TextArea
                    placeholder={t("settings.pasteJsonHere")}
                    value={json}
                    onChange={onJsonChanged}
                    rows={8}
                    style={{ fontFamily: "monospace", fontSize: "14px" }}
                />
            </Card>

            {staged.length > 0 && (
                <div>
                    <div style={{ fontSize: "17px", fontWeight: 600, marginBottom: "16px" }}>
                        {t("settings.stagingArea")} ({staged.length} {t("settings.ingredients")})
                    </div>
                    <div style={{ maxHeight: "500px", overflowY: "auto", padding: "8px" }}>
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
