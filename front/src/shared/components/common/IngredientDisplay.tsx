import React from "react";
import {Tag, Space} from "antd";
import {Ingredient, IngredientType} from "../../../model/ingredient";
import {VectorGraphics} from "../../../lib/vectorGraphics";
import {useTranslation} from "react-i18next";
import {getTagColors} from "../../../lib/tagColors";
import "./IngredientDisplay.css";

interface IngredientDisplayProps {
    ingredient: Ingredient;
    variant?: "card" | "badge" | "compact";
    showTags?: boolean;
    showIcon?: boolean;
}

export function IngredientDisplay(props: IngredientDisplayProps) {
    const {ingredient, variant = "card", showTags = true, showIcon = true} = props;
    const {t} = useTranslation();
    
    const isFill = ingredient.type === IngredientType.FILL;
    const icon = isFill ? VectorGraphics.INGREDIENT : VectorGraphics.SAUCE;
    
    const getTags = () => {
        if (!showTags) return null;
        
        const tags = [];
        if (ingredient.meat) {
            const colors = getTagColors('meat');
            tags.push(
                <Tag 
                    key="meat" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    {t("tags.meat")}
                </Tag>
            );
        }
        if (ingredient.vegan) {
            const colors = getTagColors('vegan');
            tags.push(
                <Tag 
                    key="vegan" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    {t("tags.vegan")}
                </Tag>
            );
        }
        if (ingredient.vegetarian) {
            const colors = getTagColors('vegetarian');
            tags.push(
                <Tag 
                    key="vegetarian" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    {t("tags.vegetarian")}
                </Tag>
            );
        }
        if (ingredient.fish) {
            const colors = getTagColors('fish');
            tags.push(
                <Tag 
                    key="fish" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    {t("tags.fish")}
                </Tag>
            );
        }
        if (ingredient.histamine) {
            const colors = getTagColors('histamine');
            tags.push(
                <Tag 
                    key="histamine" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    {t("tags.histamine")}
                </Tag>
            );
        }
        if (ingredient.gluten) {
            const colors = getTagColors('gluten');
            tags.push(
                <Tag 
                    key="gluten" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    {t("tags.gluten")}
                </Tag>
            );
        }
        if (ingredient.lactose) {
            const colors = getTagColors('lactose');
            tags.push(
                <Tag 
                    key="lactose" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    {t("tags.lactose")}
                </Tag>
            );
        }
        if (ingredient.fructose) {
            const colors = getTagColors('fructose');
            tags.push(
                <Tag 
                    key="fructose" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    {t("tags.fructose")}
                </Tag>
            );
        }
        if (ingredient.spicy !== undefined && ingredient.spicy > 0) {
            const colors = getTagColors('spicy');
            const chiliCount = Math.min(Math.max(0, ingredient.spicy), 3);
            tags.push(
                <Tag 
                    key="spicy" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    {'🌶️'.repeat(chiliCount)} {t("ingredient.spicy")} ({chiliCount}/3)
                </Tag>
            );
        }
        if (ingredient.wildcard) {
            const colors = getTagColors('wildcard');
            tags.push(
                <Tag 
                    key="wildcard" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    🃏 {t("ingredient.wildcard")}
                </Tag>
            );
        }
        if (ingredient.sweet) {
            const colors = getTagColors('sweet');
            tags.push(
                <Tag 
                    key="sweet" 
                    className="ingredient-tag"
                    style={{
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    🍬 {t("ingredient.sweet")}
                </Tag>
            );
        }
        return tags.length > 0 ? (
            <div className="ingredient-tags-container">
                {tags}
            </div>
        ) : null;
    };

    if (variant === "badge") {
        // Simple badge style for compact displays (like Dashboard)
        return (
            <Tag 
                color={isFill ? "blue" : "default"} 
                key={`ingredient-${ingredient.id}`} 
                className="ingredient-display-badge"
                style={{
                    backgroundColor: isFill ? 'rgba(0, 113, 227, 0.1)' : 'rgba(142, 142, 147, 0.1)',
                    color: isFill ? '#0071e3' : '#8e8e93'
                }}
            >
                {showIcon && <span className="ingredient-badge-icon">{icon}</span>}
                {ingredient.name}
            </Tag>
        );
    }

    if (variant === "compact") {
        // Compact inline style - responsive for mobile
        return (
            <div className="ingredient-display-compact">
                <div className="ingredient-display-compact-main">
                    {showIcon && <span className="ingredient-compact-icon">{icon}</span>}
                    <span className="ingredient-name-compact">{ingredient.name}</span>
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

    // Default "card" variant - styled container
    const backgroundColor = isFill ? 'rgba(0, 113, 227, 0.08)' : 'rgba(142, 142, 147, 0.08)';
    const borderColor = isFill ? 'rgba(0, 113, 227, 0.2)' : 'rgba(142, 142, 147, 0.2)';
    
    return (
        <div 
            className="ingredient-card"
            style={{
                backgroundColor: backgroundColor,
                borderColor: borderColor
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.borderColor = isFill ? 'rgba(0, 113, 227, 0.3)' : 'rgba(142, 142, 147, 0.3)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.borderColor = borderColor;
            }}
        >
            <div 
                className="ingredient-card-header"
                style={{ marginBottom: showTags ? '8px' : '0' }}
            >
                {showIcon && <span className="ingredient-card-header-icon">{icon}</span>}
                <span>{ingredient.name}</span>
            </div>
            {showTags && getTags()}
        </div>
    );
}
