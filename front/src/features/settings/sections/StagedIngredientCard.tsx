import { Card, Checkbox, Col, Form, Input, Row, Select, Slider, Space, Switch } from "antd";
import { useTranslation } from "react-i18next";
import { IngredientType } from "../../../api/generated/model";
import type { StagedIngredient } from "../ingredientImport";
import "../SettingsView.css";

export type StagedFieldChange = <K extends keyof StagedIngredient>(
    index: number,
    field: K,
    value: StagedIngredient[K],
) => void;

// An ingredient has exactly one category; switching one on switches the others off.
const CATEGORIES = ["meat", "vegetarian", "vegan", "fish"] as const;
const INTOLERANCES = ["gluten", "histamine", "fructose", "lactose"] as const;

interface StagedIngredientCardProps {
    ingredient: StagedIngredient;
    index: number;
    onChange: StagedFieldChange;
    errors: Record<string, string> | undefined;
}

export function StagedIngredientCard({ ingredient, index, onChange, errors }: StagedIngredientCardProps) {
    const { t } = useTranslation();

    function setCategory(category: (typeof CATEGORIES)[number], checked: boolean) {
        if (checked) {
            CATEGORIES.filter((other) => other !== category).forEach((other) => onChange(index, other, false));
        }
        onChange(index, category, checked);
    }

    return (
        <Card
            className="settings-editable-ingredient-card"
            style={{ border: errors && Object.keys(errors).length > 0 ? "1px solid #ff4d4f" : "1px solid #d9d9d9" }}
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
                                options={[
                                    { value: IngredientType.FILL, label: t("ingredient.fill") || "FILL" },
                                    { value: IngredientType.SAUCE, label: t("ingredient.sauce") || "SAUCE" },
                                ]}
                            />
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
                                {CATEGORIES.map((category) => (
                                    <Switch
                                        key={category}
                                        checked={ingredient[category]}
                                        onChange={(checked) => setCategory(category, checked)}
                                        checkedChildren={t(`tags.${category}`)}
                                        unCheckedChildren={t(`tags.${category}`)}
                                    />
                                ))}
                                {INTOLERANCES.map((flag) => (
                                    <Switch
                                        key={flag}
                                        checked={ingredient[flag]}
                                        onChange={(checked) => onChange(index, flag, checked)}
                                        checkedChildren={t(`tags.${flag}`)}
                                        unCheckedChildren={t(`tags.${flag}`)}
                                    />
                                ))}
                            </Space>
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item label={t("ingredient.additionalProperties") || "Additional Properties"}>
                            <Space orientation="vertical" style={{ width: "100%" }}>
                                <div>
                                    <div style={{ marginBottom: "8px" }}>
                                        {t("ingredient.spicy") || "Spicy"} ({ingredient.spicy || 0}/3)
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
                                    onChange={(e) => onChange(index, "wildcard", e.target.checked)}
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
