import {Collapse, Space, Empty, Badge, Spin} from "antd";
import {IngredientType} from "../../../api/generated/model";
import type {IngredientForUserDto} from "../../../api/generated/model";
import {useTranslation} from "react-i18next";
import {ItemList} from "../../../shared/ItemList/ItemList";
import {IngredientListGroupItem} from "./IngredientListGroupItem";
import "./IngredientList.css";

interface IngredientListViewProps {
    ingredients: IngredientForUserDto[];
    loading: boolean;
    onDelete: (ingredient: IngredientForUserDto) => void;
    onRefill: (ingredient: IngredientForUserDto) => void;
    onEdit: (ingredient: IngredientForUserDto) => void;
    type: IngredientType;
}

export function IngredientListView(props: IngredientListViewProps) {
    const { t } = useTranslation();
    const { ingredients, loading, onDelete, onRefill, onEdit, type } = props;

    const renderIngredients = () => {
        const filteredIngredients = ingredients.filter(ingredient => ingredient.type === type);
        
        // Separate by available status and applicability
        const availableApplicable = filteredIngredients.filter(ingredient => 
            ingredient.available && ingredient.applicable
        );
        const availableNonApplicable = filteredIngredients.filter(ingredient => 
            ingredient.available && !ingredient.applicable
        );
        const unavailableIngredients = filteredIngredients.filter(ingredient => !ingredient.available);

        const collapseItems = [];

        // Add non-applicable ingredients in a collapsible section
        if (availableNonApplicable.length > 0) {
            collapseItems.push({
                key: `ingredients-${type}-non-applicable`,
                label: (
                    <Space>
                        <span className="ingredient-group-label">
                            {t("ingredient.nonApplicable")}
                        </span>
                        <Badge count={availableNonApplicable.length} showZero className="ingredient-group-count" />
                    </Space>
                ),
                children: (
                    <ItemList
                        items={availableNonApplicable}
                        rowKey={(ingredient) => ingredient.id}
                        renderItem={(ingredient: IngredientForUserDto) => (
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
                        <span className="ingredient-group-label ingredient-group-unavailable">
                            {t("ingredient.unavailable")}
                        </span>
                        <Badge count={unavailableIngredients.length} showZero className="ingredient-group-count ingredient-group-unavailable" />
                    </Space>
                ),
                children: (
                    <ItemList
                        items={unavailableIngredients}
                        rowKey={(ingredient) => ingredient.id}
                        renderItem={(ingredient: IngredientForUserDto) => (
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
                    <div className="empty-state">
                        <Spin size="large" />
                    </div>
                ) : availableApplicable.length === 0 && collapseItems.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={type === IngredientType.FILL 
                            ? t("ingredient.noIngredients")
                            : t("ingredient.noSauces")
                        }
                        className="ingredient-list-empty"
                    />
                ) : (
                    <>
                        {availableApplicable.length > 0 && (
                            <ItemList
                                items={availableApplicable}
                                rowKey={(ingredient) => ingredient.id}
                                renderItem={(ingredient: IngredientForUserDto) => (
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
                            <Collapse items={collapseItems} className={availableApplicable.length > 0 ? "mt-16" : undefined} />
                        )}
                    </>
                )}
            </>
        );
    };

    return renderIngredients();
}

