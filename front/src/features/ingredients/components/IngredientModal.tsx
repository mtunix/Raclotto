import { useState, type ReactNode } from 'react';
import { Modal, Form, Input, Radio, Button, message, Checkbox, Slider, Card } from 'antd';
import { useTranslation } from "react-i18next";
import { IngredientType } from "../../../api/generated/model";
import type { IngredientForUserDto, UpdateIngredientBody } from "../../../api/generated/model";
import { useAppStore } from "../../../AppSlice";
import { ingredientCatalog } from "../ingredientCatalog";
import { ALLERGENS, CATEGORIES, isAllergen, isCategory, useIngredientDraft } from "../ingredientDraft";
import { ExclusiveTagChipGroup, TagChipGroup } from "../../../shared/TagChipGroup";
import "./IngredientModal.css";

interface IngredientModalProps {
    // Modal props
    visible: boolean;
    onCancel: () => void;
    
    // Mode props
    mode: 'add' | 'edit';
    
    // Edit mode props
    ingredient?: IngredientForUserDto | null;
    onSave?: (ingredientId: number, data: UpdateIngredientBody) => Promise<void>;
    
    // Add mode props
    onSuccess?: () => void;
    initialType?: IngredientType;
    
    // Context props
    context?: 'ingredients' | 'sauces';
}

interface SectionProps {
    title: string;
    /** The last section, which has its controls further apart and more space below. */
    last?: boolean;
    children: ReactNode;
}

function Section({ title, last = false, children }: SectionProps) {
    return (
        <Card className={last ? "ingredient-modal-section ingredient-modal-section-last" : "ingredient-modal-section"} classNames={{ body: "ingredient-modal-section-body" }}>
            <div className={last ? "ingredient-modal-section-content ingredient-modal-section-content-wide" : "ingredient-modal-section-content"}>
                <div className="ingredient-modal-section-title">{title}</div>
                {children}
            </div>
        </Card>
    );
}

/** A control with the message of what is wrong with it below. */
function Checked({ error, children }: { error?: string; children: ReactNode }) {
    return (
        <Form.Item className="mb-0" validateStatus={error ? "error" : undefined} help={error}>
            {children}
        </Form.Item>
    );
}

const categoryOptions = CATEGORIES.map((name) => ({ name, key: `tags.${name}` }));
const allergenOptions = ALLERGENS.map((name) => ({ name, key: `tags.${name}` }));

export function IngredientModal(props: IngredientModalProps) {
    const { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const [loading, setLoading] = useState(false);
    const editing = props.mode === 'edit' ? props.ingredient ?? null : null;
    const newType = props.initialType ?? (props.context === 'sauces' ? IngredientType.SAUCE : IngredientType.FILL);
    const { draft, body, nameMissing, categoryMissing, change, check } = useIngredientDraft(props.visible, editing, newType);

    /** The request the save button makes; null when there is nothing to save to. */
    const save = (): Promise<void> | null => {
        if (props.mode === 'edit') {
            if (!props.ingredient || !props.onSave) return Promise.resolve();
            return props.onSave(props.ingredient.id, body).then(() => {
                message.success(t("ingredient.updated"));
            });
        }
        if (!sessionKey) return null;
        return ingredientCatalog.create(sessionKey, body).then(() => {
            message.success(t("ingredient.added"));
            props.onSuccess?.();
        });
    };

    const handleSave = () => {
        if (!check()) return;
        const saving = save();
        if (!saving) return;
        setLoading(true);
        saving
            .then(() => props.onCancel())
            .catch((error: unknown) => {
                console.error(`Failed to ${props.mode} ingredient:`, error);
                message.error(props.mode === 'edit' ? t("ingredient.updateFailed") : t("ingredient.addFailed"));
            })
            .finally(() => setLoading(false));
    };

    const title = props.mode === 'edit'
        ? t("ingredient.editIngredient")
        : props.initialType === IngredientType.SAUCE ? t("ingredient.addSauce") : t("ingredient.addIngredient");

    return (
        <Modal
            title={title}
            open={props.visible}
            onCancel={props.onCancel}
            footer={[
                <Button key="cancel" onClick={props.onCancel}>
                    {t("common.cancel")}
                </Button>,
                <Button 
                    key="save" 
                    type="primary" 
                    loading={loading} 
                    disabled={categoryMissing}
                    onClick={handleSave}
                >
                    {props.mode === 'edit' ? t("common.save") : t("common.create")}
                </Button>,
            ]}
            width={600}
            destroyOnHidden={true}
        >
            <Form layout="vertical">
                <div className="ingredient-modal-body">
                <Section title={t("ingredient.ingredientName")}>
                    <Checked error={nameMissing ? t("ingredient.nameRequired") : undefined}>
                        <Input
                            size="large"
                            value={draft.name}
                            onChange={(e) => change({ name: e.target.value })}
                            placeholder={t("common.enterName")}
                            className="ingredient-modal-name"
                        />
                    </Checked>
                </Section>

                <Section title={t("ingredient.type")}>
                    <Radio.Group
                        size="large"
                        value={draft.type}
                        onChange={(e) => change({ type: e.target.value as IngredientType })}
                    >
                        <Radio value={IngredientType.FILL} className="ingredient-modal-radio ingredient-modal-radio-first">
                            {t("ingredient.fill")}
                        </Radio>
                        <Radio value={IngredientType.SAUCE} className="ingredient-modal-radio">
                            {t("ingredient.sauce")}
                        </Radio>
                    </Radio.Group>
                </Section>

                <Section title={t("ingredient.category")}>
                    <Checked error={categoryMissing ? t("ingredient.categoryRequired") : undefined}>
                        <ExclusiveTagChipGroup
                            options={categoryOptions}
                            selectedValue={draft.category}
                            onChange={(category) => change({ category: isCategory(category) ? category : null })}
                        />
                    </Checked>
                </Section>

                <Section title={t("ingredient.allergens")}>
                    <TagChipGroup
                        options={allergenOptions}
                        values={draft.allergens}
                        onChange={(allergen, on) => {
                            if (isAllergen(allergen)) change({ allergens: { ...draft.allergens, [allergen]: on } });
                        }}
                    />
                </Section>

                <Section title={t("ingredient.additionalProperties")} last>
                    <div>
                        <div className="ingredient-modal-label">
                            {t("ingredient.spicy")}
                        </div>
                        <Slider
                            min={0}
                            max={3}
                            marks={{ 0: '0', 1: '1', 2: '2', 3: '3' }}
                            value={draft.spicy}
                            onChange={(spicy) => change({ spicy })}
                        />
                    </div>

                    <Checkbox
                        checked={draft.wildcard}
                        onChange={(e) => change({ wildcard: e.target.checked })}
                        className="ingredient-modal-check"
                    >
                        {t("ingredient.wildcard")}
                    </Checkbox>

                    <Checkbox
                        checked={draft.sweet}
                        onChange={(e) => change({ sweet: e.target.checked })}
                        className="ingredient-modal-check"
                    >
                        {t("ingredient.sweet")}
                    </Checkbox>
                </Section>
            </div>
            </Form>
        </Modal>
    );
}
