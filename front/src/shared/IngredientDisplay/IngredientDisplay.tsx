import {Tag} from "antd";
import {IngredientType} from "../../api/generated/model";
import type {IngredientDto} from "../../api/generated/model";
import {VectorGraphics} from "../../lib/vectorGraphics";
import {useTranslation} from "react-i18next";
import {displayName} from "../displayName";
import "../tagColors.css";
import "./IngredientDisplay.css";

interface IngredientDisplayProps {
    ingredient: IngredientDto;
    variant?: "card" | "badge" | "compact";
    showTags?: boolean;
    showIcon?: boolean;
}

export function IngredientDisplay(props: IngredientDisplayProps) {
    const {ingredient, variant = "card", showTags = true, showIcon = true} = props;
    const {t} = useTranslation();
    
    const isFill = ingredient.type === IngredientType.FILL;
    const icon = isFill ? VectorGraphics.INGREDIENT : VectorGraphics.SAUCE;
    const name = displayName(ingredient.name, t);
    
    const getTags = () => {
        if (!showTags) return null;

        const chiliCount = Math.min(Math.max(0, ingredient.spicy ?? 0), 3);
        const tags: [string, boolean | undefined, string][] = [
            ["meat", ingredient.meat, t("tags.meat")],
            ["vegan", ingredient.vegan, t("tags.vegan")],
            ["vegetarian", ingredient.vegetarian, t("tags.vegetarian")],
            ["fish", ingredient.fish, t("tags.fish")],
            ["histamine", ingredient.histamine, t("tags.histamine")],
            ["gluten", ingredient.gluten, t("tags.gluten")],
            ["lactose", ingredient.lactose, t("tags.lactose")],
            ["fructose", ingredient.fructose, t("tags.fructose")],
            ["spicy", chiliCount > 0, `${'🌶️'.repeat(chiliCount)} ${t("ingredient.spicy")} (${chiliCount}/3)`],
            ["wildcard", ingredient.wildcard, `🃏 ${t("ingredient.wildcard")}`],
            ["sweet", ingredient.sweet, `🍬 ${t("ingredient.sweet")}`],
        ];
        const shown = tags.filter(([, on]) => on);
        return shown.length > 0 ? (
            <div className="ingredient-tags-container">
                {shown.map(([name, , label]) => (
                    <Tag key={name} className={`ingredient-tag tag-color-${name}`}>
                        {label}
                    </Tag>
                ))}
            </div>
        ) : null;
    };

    if (variant === "badge") {
        // Simple badge style for compact displays (like Dashboard)
        return (
            <Tag 
                color={isFill ? "blue" : "default"} 
                key={`ingredient-${ingredient.id}`} 
                className={`ingredient-display-badge ${isFill ? "ingredient-fill" : "ingredient-sauce"}`}
            >
                {showIcon && <span className="ingredient-badge-icon">{icon}</span>}
                {name}
            </Tag>
        );
    }

    if (variant === "compact") {
        // Compact inline style - responsive for mobile
        return (
            <div className="ingredient-display-compact">
                <div className="ingredient-display-compact-main">
                    {showIcon && <span className="ingredient-compact-icon">{icon}</span>}
                    <span className="ingredient-name-compact">{name}</span>
                    {showTags && (
                        <div className="ingredient-tags-container-inline">
                            {getTags()}
                        </div>
                    )}
                </div>
                {showTags && (
                    <div className="ingredient-tags-container-mobile">
                        {getTags()}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`ingredient-card ${isFill ? "ingredient-fill" : "ingredient-sauce"}`}>
            <div className={showTags ? "ingredient-card-header ingredient-card-header-tagged" : "ingredient-card-header"}>
                {showIcon && <span className="ingredient-card-header-icon">{icon}</span>}
                <span>{name}</span>
            </div>
            {showTags && getTags()}
        </div>
    );
}
