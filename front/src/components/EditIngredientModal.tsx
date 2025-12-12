import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Radio, Space, Switch, Button, message } from "antd";
import { Ingredient, IngredientType } from "../model/ingredient";
import { useTranslation } from "react-i18next";

interface EditIngredientModalProps {
    ingredient: Ingredient | null;
    visible: boolean;
    onCancel: () => void;
    onSave: (ingredientId: number, data: Partial<Ingredient>) => Promise<void>;
}

export function EditIngredientModal(props: EditIngredientModalProps) {
    const { ingredient, visible, onCancel, onSave } = props;
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const options = [
        { name: "meat", key: "tags.meat" },
        { name: "vegetarian", key: "tags.vegetarian" },
        { name: "vegan", key: "tags.vegan" },
        { name: "histamine", key: "tags.histamine" },
        { name: "gluten", key: "tags.gluten" },
        { name: "fructose", key: "tags.fructose" },
        { name: "lactose", key: "tags.lactose" },
    ];

    useEffect(() => {
        if (ingredient && visible) {
            form.setFieldsValue({
                name: ingredient.name,
                type: ingredient.type,
                meat: ingredient.meat,
                vegetarian: ingredient.vegetarian,
                vegan: ingredient.vegan,
                gluten: ingredient.gluten,
                histamine: ingredient.histamine,
                fructose: ingredient.fructose,
                lactose: ingredient.lactose,
            });
        }
    }, [ingredient, visible, form]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (!ingredient) return;
            
            setLoading(true);
            await onSave(ingredient.id, values);
            message.success(t("ingredient.updated") || "Ingredient updated successfully");
            form.resetFields();
            onCancel();
        } catch (error: any) {
            if (error.errorFields) {
                // Form validation errors
                return;
            }
            console.error("Failed to update ingredient:", error);
            message.error(t("ingredient.updateFailed") || "Failed to update ingredient");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={t("ingredient.editIngredient") || "Edit Ingredient"}
            open={visible}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    {t("common.cancel") || "Cancel"}
                </Button>,
                <Button key="save" type="primary" loading={loading} onClick={handleSave}>
                    {t("common.save") || "Save"}
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    label={t("ingredient.ingredientName")}
                    name="name"
                    rules={[{ required: true, message: t("ingredient.nameRequired") || "Name is required" }]}
                >
                    <Input placeholder={t("common.enterName")} />
                </Form.Item>
                <Form.Item
                    label={t("ingredient.type")}
                    name="type"
                    rules={[{ required: true }]}
                >
                    <Radio.Group>
                        <Radio value={IngredientType.FILL}>{t("ingredient.fill")}</Radio>
                        <Radio value={IngredientType.SAUCE}>{t("ingredient.sauce")}</Radio>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label={t("ingredient.contains")}>
                    <Space wrap>
                        {options.map((option) => (
                            <Form.Item
                                key={option.name}
                                name={option.name}
                                valuePropName="checked"
                                style={{ marginBottom: 0 }}
                            >
                                <Switch
                                    checkedChildren={t(option.key)}
                                    unCheckedChildren={t(option.key)}
                                />
                            </Form.Item>
                        ))}
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
}
