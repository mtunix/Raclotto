import React, {useCallback} from "react";
import {Collapse, List, Space, Empty, Badge, Spin} from "antd";
import {Ingredient, IngredientType} from "../model/ingredient";
import {useTranslation} from "react-i18next";
import {IngredientListGroupItem} from "./IngredientListGroupItem";

interface IngredientListViewProps {
    ingredients: Ingredient[];
    loading: boolean;
    onDelete: (ingredient: Ingredient) => void;
    onRefill: (ingredient: Ingredient) => void;
    onEdit: (ingredient: Ingredient) => void;
    type: IngredientType;
}

export function IngredientListView(props: IngredientListViewProps) {
    const { t } = useTranslation();
    const { ingredients, loading, onDelete, onRefill, onEdit, type } = props;

    const renderIngredients = useCallback(() => {
        const filteredIngredients = ingredients.filter(ingredient => ingredient.type === type);
        
        // Separate by available status and applicability
        const availableApplicable = filteredIngredients.filter(ingredient => 
            ingredient.available && (ingredient.applicable !== false)
        );
        const availableNonApplicable = filteredIngredients.filter(ingredient => 
            ingredient.available && ingredient.applicable === false
        );
        const unavailableIngredients = filteredIngredients.filter(ingredient => !ingredient.available);

        const collapseItems = [];

        // Add non-applicable ingredients in a collapsible section
        if (availableNonApplicable.length > 0) {
            collapseItems.push({
                key: `ingredients-${type}-non-applicable`,
                label: (
                    <Space>
                        <span style={{fontWeight: 500, color: '#8e8e93', fontSize: '15px', letterSpacing: '-0.022em'}}>
                            {t("ingredient.nonApplicable") || "Not applicable for your diet"}
                        </span>
                        <Badge count={availableNonApplicable.length} showZero style={{ backgroundColor: '#8e8e93' }} />
                    </Space>
                ),
                children: (
                    <List
                        dataSource={availableNonApplicable}
                        renderItem={(ingredient: Ingredient) => (
                            <IngredientListGroupItem
                                ingredient={ingredient}
                                onDelete={() => onDelete(ingredient)}
                                onEdit={() => onEdit(ingredient)}
                                available={ingredient.available}
                            />
                        )}
                    />
                )
            });
        }

        // Add unavailable ingredients
        if (unavailableIngredients.length > 0) {
            collapseItems.push({
                key: `ingredients-${type}-unavailable`,
                label: (
                    <Space>
                        <span style={{fontWeight: 500, color: '#ff3b30', fontSize: '15px', letterSpacing: '-0.022em'}}>
                            {t("ingredient.unavailable") || "Unavailable"}
                        </span>
                        <Badge count={unavailableIngredients.length} showZero style={{ backgroundColor: '#ff3b30' }} />
                    </Space>
                ),
                children: (
                    <List
                        dataSource={unavailableIngredients}
                        renderItem={(ingredient: Ingredient) => (
                            <IngredientListGroupItem
                                ingredient={ingredient}
                                onRefill={() => onRefill(ingredient)}
                                onEdit={() => onEdit(ingredient)}
                                available={ingredient.available}
                            />
                        )}
                    />
                )
            });
        }

        return (
            <>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin size="large" />
                    </div>
                ) : availableApplicable.length === 0 && collapseItems.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={type === IngredientType.FILL 
                            ? (t("ingredient.noIngredients") || "No ingredients")
                            : (t("ingredient.noSauces") || "No sauces")
                        }
                        style={{ padding: '40px 0' }}
                    />
                ) : (
                    <>
                        {availableApplicable.length > 0 && (
                            <List
                                dataSource={availableApplicable}
                                renderItem={(ingredient: Ingredient) => (
                                    <IngredientListGroupItem
                                        ingredient={ingredient}
                                        onDelete={() => onDelete(ingredient)}
                                        onEdit={() => onEdit(ingredient)}
                                        available={ingredient.available}
                                    />
                                )}
                            />
                        )}
                        {collapseItems.length > 0 && (
                            <Collapse items={collapseItems} style={{ marginTop: availableApplicable.length > 0 ? '16px' : '0' }} />
                        )}
                    </>
                )}
            </>
        );
    }, [ingredients, loading, onDelete, onRefill, onEdit, type, t]);

    return renderIngredients();
}

