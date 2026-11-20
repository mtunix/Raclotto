import {Button} from "antd";
import {EditOutlined} from "@ant-design/icons";
import {IngredientType} from "../../../api/generated/model";
import type {IngredientForUserDto} from "../../../api/generated/model";
import {useTranslation} from "react-i18next";
import {IngredientDisplay} from "../../../shared/IngredientDisplay/IngredientDisplay";
import {ConfirmDeleteButton} from "../../../shared/ConfirmDeleteButton";
import {ItemRow} from "../../../shared/ItemList/ItemList";
import {VectorGraphics} from "../../../lib/vectorGraphics";
import "./IngredientList.css";

interface IngredientListGroupItemProps {
    ingredient: IngredientForUserDto;
    available: boolean;
    onDelete?: () => void;
    onRefill?: () => void;
    onEdit?: () => void;
}

export function IngredientListGroupItem(props: IngredientListGroupItemProps) {
    const { t } = useTranslation();
    const state = !props.available
        ? "ingredient-list-item-unavailable"
        : props.ingredient.type === IngredientType.FILL ? "ingredient-list-item-fill" : "ingredient-list-item-sauce";
    const muted = props.ingredient.applicable ? "" : " ingredient-list-item-muted";

    return (
        <ItemRow className={`ingredient-list-item ${state}${muted}`}>
            <div className="ingredient-list-item-content">
                <div className="ingredient-list-item-main">
                    <IngredientDisplay 
                        ingredient={props.ingredient}
                        variant="compact"
                        showTags={true}
                        showIcon={true}
                    />
                </div>
                <div className="ingredient-list-item-actions">
                    {props.onEdit && (
                        <Button
                            type="text"
                            size="small"
                            className="ingredient-action-button"
                            icon={<EditOutlined />}
                            onClick={props.onEdit}
                            title={t("common.edit")}
                        />
                    )}
                    {props.available && props.onDelete && (
                        <ConfirmDeleteButton
                            onConfirm={props.onDelete}
                            label={t("ingredient.markUnavailable")}
                            danger={true}
                            className="ingredient-action-button"
                        />
                    )}
                    {!props.available && props.onRefill && (
                        <ConfirmDeleteButton
                            onConfirm={props.onRefill}
                            label={t("ingredient.makeAvailable")}
                            danger={false}
                            className="ingredient-action-button"
                            icon={VectorGraphics.REPEAT}
                        />
                    )}
                </div>
            </div>
        </ItemRow>
    );
}

