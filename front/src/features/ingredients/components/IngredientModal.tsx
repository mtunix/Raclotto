import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Radio, Space, Button, message, Checkbox, Slider, Card, Row, Col } from 'antd';
import { Ingredient, IngredientType } from "../../../model/ingredient";
import { useTranslation } from "react-i18next";
import { Api } from "../../../lib/api";
import { useAppStore } from "../../../AppSlice";
import { mutateIngredients } from "../../../lib/api/swrHooks";
import { ExclusiveTagChipGroup } from "../../../shared/ExclusiveTagChipGroup";
import { MultiTagChipGroup } from "../../../shared/MultiTagChipGroup";

interface IngredientModalProps {
    // Modal props
    visible: boolean;
    onCancel: () => void;
    
    // Mode props
    mode: 'add' | 'edit';
    
    // Edit mode props
    ingredient?: Ingredient | null;
    onSave?: (ingredientId: number, data: Partial<Ingredient>) => Promise<void>;
    
    // Add mode props
    onSuccess?: () => void;
    initialType?: IngredientType;
    
    // Context props
    context?: 'ingredients' | 'sauces';
}

export function IngredientModal(props: IngredientModalProps) {
    const { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const [form] = Form.useForm();
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
    const getInitialValues = () => {
        if (props.mode === 'edit' && props.ingredient) {
            return {
                name: props.ingredient.name,
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
    };

    useEffect(() => {
        if (props.visible) {
            if (props.mode === 'edit' && props.ingredient) {
                // Edit mode: set local state for components not managed by form
                const spicyValue = props.ingredient.spicy || 0;
                setSpicyLevel(spicyValue);
                setSelectedType(props.ingredient.type);
                setIngredientName(props.ingredient.name || "");
                
                // Set category state
                const category = props.ingredient.meat ? "meat" :
                               props.ingredient.vegetarian ? "vegetarian" :
                               props.ingredient.vegan ? "vegan" :
                               props.ingredient.fish ? "fish" : null;
                setSelectedCategory(category);
                
                // Set allergen state
                setAllergenValues({
                    gluten: props.ingredient.gluten || false,
                    histamine: props.ingredient.histamine || false,
                    fructose: props.ingredient.fructose || false,
                    lactose: props.ingredient.lactose || false,
                });
                
                // Reset form fields with ingredient data
                form.resetFields();
                form.setFieldsValue(getInitialValues());
            } else {
                // Add mode: reset local state and set default type based on context
                setSpicyLevel(0);
                setSelectedCategory("vegetarian");
                setIngredientName("");
                setAllergenValues({
                    gluten: false,
                    histamine: false,
                    fructose: false,
                    lactose: false,
                });
                
                // Set default type based on context or initialType
                let defaultType = IngredientType.FILL;
                if (props.initialType) {
                    defaultType = props.initialType;
                } else if (props.context === 'sauces') {
                    defaultType = IngredientType.SAUCE;
                }
                setSelectedType(defaultType);
                
                // Reset form fields with new initial values
                form.resetFields();
                form.setFieldsValue(getInitialValues());
            }
        }
    }, [props.visible, props.mode, props.ingredient, props.initialType, props.context, form]);

    const handleCategoryChange = (category: string | null) => {
        setSelectedCategory(category);
    };

    const handleTypeChange = (type: IngredientType) => {
        setSelectedType(type);
        form.setFieldsValue({ type });
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            
            // Convert category selection to boolean flags
            const categoryFlags = {
                meat: selectedCategory === "meat",
                vegetarian: selectedCategory === "vegetarian",
                vegan: selectedCategory === "vegan",
                fish: selectedCategory === "fish",
            };
            
            // Get form values for checkboxes that might not be in form
            const formValues = form.getFieldsValue();
            
            // Combine all data
            const ingredientData = {
                name: values.name, // Ensure name is included
                type: values.type, // Ensure type is included
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
            
            console.log('Saving ingredient data:', ingredientData); // Debug log
            
            setLoading(true);
            
            if (props.mode === 'edit' && props.ingredient && props.onSave) {
                // Edit mode: update existing ingredient
                await props.onSave(props.ingredient.id, ingredientData);
                message.success(t("ingredient.updated") || "Ingredient updated successfully");
            } else if (props.mode === 'add') {
                // Add mode: create new ingredient
                if (!sessionKey) return;
                
                await Api.add(sessionKey, ingredientData);
                mutateIngredients(sessionKey);
                message.success(t("ingredient.added") || "Ingredient added successfully");
                
                if (props.onSuccess) {
                    props.onSuccess();
                }
            }
            
            form.resetFields();
            setSelectedCategory("vegetarian");
            setAllergenValues({});
            props.onCancel();
        } catch (error: any) {
            if (error.errorFields) {
                // Form validation errors
                return;
            }
            console.error(`Failed to ${props.mode} ingredient:`, error);
            
            const errorMessage = props.mode === 'edit' 
                ? (t("ingredient.updateFailed") || "Failed to update ingredient")
                : (t("ingredient.addFailed") || "Failed to add ingredient");
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        props.onCancel();
    };

    const getTitle = () => {
        if (props.mode === 'edit') {
            return t("ingredient.editIngredient") || "Edit Ingredient";
        } else {
            if (props.initialType === IngredientType.SAUCE) {
                return t("ingredient.addSauce") || "Add Sauce";
            }
            return t("ingredient.addIngredient") || "Add Ingredient";
        }
    };

    const getButtonText = () => {
        return props.mode === 'edit' 
            ? (t("common.save") || "Save")
            : (t("common.create") || "Create");
    };

    return (
        <Modal
            title={getTitle()}
            open={props.visible}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    {t("common.cancel") || "Cancel"}
                </Button>,
                <Button 
                    key="save" 
                    type="primary" 
                    loading={loading} 
                    onClick={handleSave}
                >
                    {getButtonText()}
                </Button>,
            ]}
            width={600}
            destroyOnClose={true}
        >
            <Form 
                key={`${props.mode}-${props.ingredient?.id}-${props.context}`}
                form={form} 
                layout="vertical"
                initialValues={getInitialValues()}
            >
                <div style={{ padding: '8px 0' }}>
                <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                    <Col span={24}>
                        <Card 
                            style={{ 
                                borderRadius: '18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <Form.Item 
                                style={{ marginBottom: 0 }}
                                name="name"
                                rules={[{ required: true, message: t("ingredient.nameRequired") || "Name is required" }]}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                        {t("ingredient.ingredientName")}
                                    </div>
                                    <Input
                                        size="large"
                                        value={ingredientName}
                                        onChange={handleNameChange}
                                        placeholder={t("common.enterName")}
                                        style={{ 
                                            fontSize: '20px',
                                            height: '44px'
                                        }}
                                    />
                                </div>
                            </Form.Item>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                    <Col span={24}>
                        <Card 
                            style={{ 
                                borderRadius: '18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <Form.Item 
                                style={{ marginBottom: 0 }}
                                name="type"
                                rules={[{ required: true }]}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                        {t("ingredient.type")}
                                    </div>
                                    <Radio.Group 
                                        size="large"
                                        value={selectedType}
                                        onChange={(e) => handleTypeChange(e.target.value)}
                                    >
                                        <Radio 
                                            value={IngredientType.FILL}
                                            style={{ 
                                                fontSize: '17px',
                                                letterSpacing: '-0.022em',
                                                marginRight: '24px',
                                                padding: '8px 0'
                                            }}
                                        >
                                            {t("ingredient.fill")}
                                        </Radio>
                                        <Radio 
                                            value={IngredientType.SAUCE}
                                            style={{ 
                                                fontSize: '17px',
                                                letterSpacing: '-0.022em',
                                                padding: '8px 0'
                                            }}
                                        >
                                            {t("ingredient.sauce")}
                                        </Radio>
                                    </Radio.Group>
                                </div>
                            </Form.Item>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                    <Col span={24}>
                        <Card 
                            style={{ 
                                borderRadius: '18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                    {t("ingredient.category") || "Category"}
                                </div>
                                <ExclusiveTagChipGroup
                                    options={categoryOptions}
                                    selectedValue={selectedCategory}
                                    onChange={handleCategoryChange}
                                />
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                    <Col span={24}>
                        <Card 
                            style={{ 
                                borderRadius: '18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                    {t("ingredient.allergens") || "Allergens"}
                                </div>
                                <MultiTagChipGroup
                                    options={allergenOptions}
                                    values={allergenValues}
                                    onChange={handleAllergenChange}
                                />
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
                    <Col span={24}>
                        <Card 
                            style={{ 
                                borderRadius: '18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                border: 'none'
                            }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.022em', color: '#1d1d1f' }}>
                                    {t("ingredient.additionalProperties") || "Additional Properties"}
                                </div>
                                
                                <div>
                                    <div style={{ marginBottom: '8px', fontSize: '17px', letterSpacing: '-0.022em' }}>
                                        {t("ingredient.spicy") || "Spicy"}
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

                                <Form.Item
                                    name="wildcard"
                                    valuePropName="checked"
                                    style={{ marginBottom: 0 }}
                                >
                                    <Checkbox style={{ fontSize: '17px', letterSpacing: '-0.022em' }}>
                                        {t("ingredient.wildcard") || "Wildcard"}
                                    </Checkbox>
                                </Form.Item>

                                <Form.Item
                                    name="sweet"
                                    valuePropName="checked"
                                    style={{ marginBottom: 0 }}
                                >
                                    <Checkbox style={{ fontSize: '17px', letterSpacing: '-0.022em' }}>
                                        {t("ingredient.sweet") || "Sweet"}
                                    </Checkbox>
                                </Form.Item>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
            </Form>
        </Modal>
    );
}
