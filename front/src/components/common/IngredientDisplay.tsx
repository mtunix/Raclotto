import React from "react";
import {Tag, Space} from "antd";
import {Ingredient, IngredientType} from "../../model/ingredient";
import {VectorGraphics} from "../../lib/vectorGraphics";
import {useTranslation} from "react-i18next";
import {getTagColors} from "../../lib/tagColors";

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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
                        backgroundColor: colors.backgroundColor,
                        color: colors.color,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
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
                    style={{
                        fontSize: "13px",
                        padding: '4px 10px',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontWeight: 500,
                        letterSpacing: '-0.011em',
                        border: 'none',
                        backgroundColor: colors.backgroundColor,
                        color: colors.color
                    }}
                >
                    🍬 {t("ingredient.sweet")}
                </Tag>
            );
        }
        return tags.length > 0 ? (
            <div className="ingredient-tags-container" style={{ 
                marginTop: '8px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
            }}>
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
                style={{
                    fontSize: "15px",
                    marginBottom: '6px',
                    marginRight: '6px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontWeight: 500,
                    letterSpacing: '-0.011em',
                    border: 'none',
                    backgroundColor: isFill ? 'rgba(0, 113, 227, 0.1)' : 'rgba(142, 142, 147, 0.1)',
                    color: isFill ? '#0071e3' : '#8e8e93'
                }}
            >
                {showIcon && <span style={{marginRight: '6px', fontSize: '16px'}}>{icon}</span>}
                {ingredient.name}
            </Tag>
        );
    }

    if (variant === "compact") {
        // Compact inline style - responsive for mobile
        return (
            <div className="ingredient-display-compact" style={{ 
                fontSize: '17px',
                fontWeight: 500,
                letterSpacing: '-0.022em',
                color: '#1d1d1f',
                width: '100%'
            }}>
                <div className="ingredient-display-compact-main" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    flexWrap: 'nowrap',
                    minWidth: 0,
                    width: '100%'
                }}>
                    {showIcon && <span style={{fontSize: '18px', flexShrink: 0}}>{icon}</span>}
                    <span className="ingredient-name-compact" style={{ flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ingredient.name}</span>
                    {showTags && (
                        <div className="ingredient-tags-container-inline" style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px'
                        }}>
                            {getTags()}
                        </div>
                    )}
                </div>
                {showTags && (
                    <div className="ingredient-tags-container-mobile" style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '8px'
                    }}>
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
            style={{
                backgroundColor: backgroundColor,
                padding: '16px',
                marginBottom: '12px',
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
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
            <div style={{ 
                fontSize: '17px', 
                fontWeight: 600, 
                marginBottom: showTags ? '8px' : '0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                letterSpacing: '-0.022em',
                color: '#1d1d1f'
            }}>
                {showIcon && <span style={{fontSize: '20px', lineHeight: '1'}}>{icon}</span>}
                <span>{ingredient.name}</span>
            </div>
            {showTags && getTags()}
        </div>
    );
}
