import { useState, useEffect, useCallback, type ChangeEvent, type ReactNode } from 'react';
import { Modal, Form, Input, Radio, Button, message, Checkbox, Slider, Card, type FormItemProps } from 'antd';
import { useTranslation } from "react-i18next";
import { IngredientType } from "../../../api/generated/model";
import type { CreateIngredientBody, IngredientForUserDto, UpdateIngredientBody } from "../../../api/generated/model";
import { useAppStore } from "../../../AppSlice";
import { categoryProblem, ingredientCatalog } from "../ingredientCatalog";
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

interface IngredientFormValues {
    name: string;
    type: IngredientType;
    spicy: number;
    wildcard?: boolean;
    sweet?: boolean;
}

interface SectionProps {
    title: string;
    /** The form field the whole section is, when it is one. */
    field?: Pick<FormItemProps, "name" | "rules">;
    /** The last section, which has its controls further apart and more space below. */
    last?: boolean;
    children: ReactNode;
}

function Section({ title, field, last = false, children }: SectionProps) {
    const content = (
        <div className={last ? "ingredient-modal-section-content ingredient-modal-section-content-wide" : "ingredient-modal-section-content"}>
            <div className="ingredient-modal-section-title">{title}</div>
            {children}
        </div>
    );
    return (
        <Card className={last ? "ingredient-modal-section ingredient-modal-section-last" : "ingredient-modal-section"} classNames={{ body: "ingredient-modal-section-body" }}>
            {field ? <Form.Item className="mb-0" {...field}>{content}</Form.Item> : content}
        </Card>
    );
}

export function IngredientModal(props: IngredientModalProps) {
    const { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const [form] = Form.useForm<IngredientFormValues>();
    const [loading, setLoading] = useState(false);

    // State for TagChipGroup components
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [allergenValues, setAllergenValues] = useState<Record<string, boolean>>({});
    const [spicyLevel, setSpicyLevel] = useState(0);
    
    // State for controlled components
    const [selectedType, setSelectedType] = useState<IngredientType>(IngredientType.FILL);
    const [ingredientName, setIngredientName] = useState<string>("");

    const categoryOptions = [
        { name: "meat", key: "tags.meat" },
        { name: "vegetarian", key: "tags.vegetarian" },
        { name: "vegan", key: "tags.vegan" },
        { name: "fish", key: "tags.fish" },
    ];
    
    const allergenOptions = [
        { name: "histamine", key: "tags.histamine" },
        { name: "gluten", key: "tags.gluten" },
        { name: "fructose", key: "tags.fructose" },
        { name: "lactose", key: "tags.lactose" },
    ];

    // Get initial values for the form
    const getInitialValues = useCallback(() => {
        if (props.mode === 'edit' && props.ingredient) {
            return {
                name: props.ingredient.name ?? "",
                type: props.ingredient.type,
                spicy: props.ingredient.spicy || 0,
                wildcard: props.ingredient.wildcard || false,
                sweet: props.ingredient.sweet || false,
            };
        } else if (props.mode === 'add' && props.initialType) {
            return {
                type: props.initialType,
                spicy: 0,
                wildcard: false,
                sweet: false,
            };
        } else if (props.mode === 'add' && props.context) {
            // Use context to determine default type
            const defaultType = props.context === 'sauces' ? IngredientType.SAUCE : IngredientType.FILL;
            return {
                type: defaultType,
                spicy: 0,
                wildcard: false,
                sweet: false,
            };
        } else {
            return {
                spicy: 0,
                wildcard: false,
                sweet: false,
            };
        }
    }, [props.mode, props.ingredient, props.initialType, props.context]);

    // The fields outside the form start over whenever the modal opens or what it edits changes.
    const source = { visible: props.visible, mode: props.mode, ingredient: props.ingredient, initialType: props.initialType, context: props.context };
    const [shownFrom, setShownFrom] = useState<typeof source | null>(null);
    if (!shownFrom || (Object.keys(source) as (keyof typeof source)[]).some((key) => shownFrom[key] !== source[key])) {
        setShownFrom(source);
        if (props.visible) {
            const ingredient = props.mode === 'edit' ? props.ingredient : null;
            setSpicyLevel(ingredient?.spicy || 0);
            setIngredientName(ingredient?.name || "");
            setSelectedCategory(ingredient
                ? ingredient.meat ? "meat" : ingredient.vegetarian ? "vegetarian" : ingredient.vegan ? "vegan" : ingredient.fish ? "fish" : null
                : "vegetarian");
            setAllergenValues({
                gluten: ingredient?.gluten || false,
                histamine: ingredient?.histamine || false,
                fructose: ingredient?.fructose || false,
                lactose: ingredient?.lactose || false,
            });
            setSelectedType(ingredient
                ? ingredient.type
                : props.initialType ?? (props.context === 'sauces' ? IngredientType.SAUCE : IngredientType.FILL));
        }
    }

    // The form's own store is outside React state, so it is reset after the render that opened the modal.
    useEffect(() => {
        if (props.visible) {
            form.resetFields();
            form.setFieldsValue(getInitialValues());
        }
    }, [props.visible, form, getInitialValues]);

    const handleCategoryChange = (category: string | null) => {
        setSelectedCategory(category);
    };

    const handleTypeChange = (type: IngredientType) => {
        setSelectedType(type);
        form.setFieldsValue({ type });
    };

    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setIngredientName(name);
        form.setFieldsValue({ name });
    };

    const handleAllergenChange = (optionName: string, checked: boolean) => {
        setAllergenValues(prev => ({
            ...prev,
            [optionName]: checked
        }));
    };

    const categoryFlags = {
        meat: selectedCategory === "meat",
        vegetarian: selectedCategory === "vegetarian",
        vegan: selectedCategory === "vegan",
        fish: selectedCategory === "fish",
    };
    // The chips allow at most one, so the only problem left is none.
    const categoryMissing = categoryProblem(categoryFlags) !== null;

    const handleSave = () => {
        void form.validateFields()
            .then(async (values) => {
                // Combine all data
                const ingredientData: CreateIngredientBody = {
                    name: values.name, // Ensure name is included
                    // The form's own value is the radio's string, from the change event bubbling up to the Form.Item.
                    type: selectedType,
                    spicy: spicyLevel, // Use local state for spicy level
                    wildcard: values.wildcard || false,
                    sweet: values.sweet || false,
                    ...categoryFlags,
                    // Ensure all allergen properties are included with defaults
                    gluten: allergenValues.gluten || false,
                    histamine: allergenValues.histamine || false,
                    fructose: allergenValues.fructose || false,
                    lactose: allergenValues.lactose || false,
                };
            
                setLoading(true);
            
                if (props.mode === 'edit' && props.ingredient && props.onSave) {
                    // Edit mode: update existing ingredient
                    await props.onSave(props.ingredient.id, ingredientData);
                    message.success(t("ingredient.updated"));
                } else if (props.mode === 'add') {
                    // Add mode: create new ingredient
                    if (!sessionKey) return;
                
                    await ingredientCatalog.create(sessionKey, ingredientData);
                    message.success(t("ingredient.added"));
                
                    if (props.onSuccess) {
                        props.onSuccess();
                    }
                }
            
                form.resetFields();
                setSelectedCategory("vegetarian");
                setAllergenValues({});
                props.onCancel();
            })
            .catch((error: unknown) => {
                if (typeof error === "object" && error !== null && "errorFields" in error) {
                    // Form validation errors
                    return;
                }
                console.error(`Failed to ${props.mode} ingredient:`, error);
            
                const errorMessage = props.mode === 'edit' 
                    ? t("ingredient.updateFailed")
                    : t("ingredient.addFailed");
                message.error(errorMessage);
            })
            .finally(() => setLoading(false));
    };

    const handleCancel = () => {
        form.resetFields();
        props.onCancel();
    };

    const getTitle = () => {
        if (props.mode === 'edit') {
            return t("ingredient.editIngredient");
        } else {
            if (props.initialType === IngredientType.SAUCE) {
                return t("ingredient.addSauce");
            }
            return t("ingredient.addIngredient");
        }
    };

    const getButtonText = () => {
        return props.mode === 'edit' 
            ? t("common.save")
            : t("common.create");
    };

    return (
        <Modal
            title={getTitle()}
            open={props.visible}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    {t("common.cancel")}
                </Button>,
                <Button 
                    key="save" 
                    type="primary" 
                    loading={loading} 
                    disabled={categoryMissing}
                    onClick={handleSave}
                >
                    {getButtonText()}
                </Button>,
            ]}
            width={600}
            destroyOnHidden={true}
        >
            <Form 
                key={`${props.mode}-${props.ingredient?.id}-${props.context}`}
                form={form} 
                layout="vertical"
                initialValues={getInitialValues()}
            >
                <div className="ingredient-modal-body">
                <Section title={t("ingredient.ingredientName")} field={{ name: "name", rules: [{ required: true, message: t("ingredient.nameRequired") }] }}>
                    <Input
                        size="large"
                        value={ingredientName}
                        onChange={handleNameChange}
                        placeholder={t("common.enterName")}
                        className="ingredient-modal-name"
                    />
                </Section>

                <Section title={t("ingredient.type")} field={{ name: "type", rules: [{ required: true }] }}>
                    <Radio.Group
                        size="large"
                        value={selectedType}
                        onChange={(e) => handleTypeChange(e.target.value as IngredientType)}
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
                    <Form.Item
                        className="mb-0"
                        validateStatus={categoryMissing ? "error" : undefined}
                        help={categoryMissing ? t("ingredient.categoryRequired") : undefined}
                    >
                        <ExclusiveTagChipGroup
                            options={categoryOptions}
                            selectedValue={selectedCategory}
                            onChange={handleCategoryChange}
                        />
                    </Form.Item>
                </Section>

                <Section title={t("ingredient.allergens")}>
                    <TagChipGroup
                        options={allergenOptions}
                        values={allergenValues}
                        onChange={handleAllergenChange}
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
                            value={spicyLevel}
                            onChange={(value) => {
                                setSpicyLevel(value);
                                form.setFieldsValue({ spicy: value });
                            }}
                        />
                    </div>

                    <Form.Item name="wildcard" valuePropName="checked" className="mb-0">
                        <Checkbox className="ingredient-modal-check">
                            {t("ingredient.wildcard")}
                        </Checkbox>
                    </Form.Item>

                    <Form.Item name="sweet" valuePropName="checked" className="mb-0">
                        <Checkbox className="ingredient-modal-check">
                            {t("ingredient.sweet")}
                        </Checkbox>
                    </Form.Item>
                </Section>
            </div>
            </Form>
        </Modal>
    );
}
