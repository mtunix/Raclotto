import React from "react";
import {List, Button, Space} from "antd";
import {EditOutlined} from "@ant-design/icons";
import {Ingredient, IngredientType} from "../../../model/ingredient";
import {useTranslation} from "react-i18next";
import {IngredientDisplay} from "../../../shared/components/common/IngredientDisplay";
import {ConfirmDeleteButton} from "../../../shared/components/ui/ConfirmDeleteButton";
import {VectorGraphics} from "../../../lib/vectorGraphics";

interface IngredientListGroupItemProps {
    ingredient: Ingredient;
    available: boolean;
    onDelete?: () => void;
    onRefill?: () => void;
    onEdit?: () => void;
}

export function IngredientListGroupItem(props: IngredientListGroupItemProps) {
    const { t } = useTranslation();
    const isApplicable = props.ingredient.applicable !== false;
    const backgroundColor = props.available 
        ? (props.ingredient.type === IngredientType.FILL ? '#e6f7ff' : '#f0f0f0')
        : '#fff1f0';
    
    // Make non-applicable ingredients more muted
    const opacity = isApplicable ? 1 : 0.6;

    return (
        <List.Item
            className="ingredient-list-item"
            style={{
                backgroundColor: backgroundColor,
                marginBottom: '8px',
                borderRadius: '6px',
                padding: '12px',
                opacity: opacity,
                border: `1px solid ${props.available 
                    ? (props.ingredient.type === IngredientType.FILL ? '#91d5ff' : '#d9d9d9')
                    : '#ffccc7'
                }`
            }}
        >
            <div style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                gap: '12px',
                flexWrap: 'nowrap'
            }}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <IngredientDisplay 
                        ingredient={props.ingredient}
                        variant="compact"
                        showTags={true}
                        showIcon={true}
                    />
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {props.onEdit && (
                        <Button
                            type="text"
                            size="small"
                            className="ingredient-action-button"
                            icon={<EditOutlined />}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                            onClick={props.onEdit}
                            title={t("common.edit") || "Edit"}
                        />
                    )}
                    {props.available && props.onDelete && (
                        <ConfirmDeleteButton
                            onConfirm={props.onDelete}
                            danger={true}
                            className="ingredient-action-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        />
                    )}
                    {!props.available && props.onRefill && (
                        <ConfirmDeleteButton
                            onConfirm={props.onRefill}
                            danger={false}
                            className="ingredient-action-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                            icon={VectorGraphics.REPEAT}
                        />
                    )}
                </div>
            </div>
        </List.Item>
    );
}

