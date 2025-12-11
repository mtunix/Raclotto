import React from "react";
import {Tag, Space} from "antd";
import {Ingredient, IngredientType} from "../../model/ingredient";
import {VectorGraphics} from "../../lib/vectorGraphics";
import {useTranslation} from "react-i18next";

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
        if (ingredient.meat) tags.push(<Tag key="meat" color="red" style={{fontSize: "0.75rem", marginBottom: '4px'}}>{t("tags.meat")}</Tag>);
        if (ingredient.vegan) tags.push(<Tag key="vegan" color="green" style={{fontSize: "0.75rem", marginBottom: '4px'}}>{t("tags.vegan")}</Tag>);
        if (ingredient.vegetarian) tags.push(<Tag key="vegetarian" color="lime" style={{fontSize: "0.75rem", marginBottom: '4px'}}>{t("tags.vegetarian")}</Tag>);
        if (ingredient.histamine) tags.push(<Tag key="histamine" color="orange" style={{fontSize: "0.75rem", marginBottom: '4px'}}>{t("tags.histamine")}</Tag>);
        if (ingredient.gluten) tags.push(<Tag key="gluten" color="gold" style={{fontSize: "0.75rem", marginBottom: '4px'}}>{t("tags.gluten")}</Tag>);
        if (ingredient.lactose) tags.push(<Tag key="lactose" color="cyan" style={{fontSize: "0.75rem", marginBottom: '4px'}}>{t("tags.lactose")}</Tag>);
        if (ingredient.fructose) tags.push(<Tag key="fructose" color="purple" style={{fontSize: "0.75rem", marginBottom: '4px'}}>{t("tags.fructose")}</Tag>);
        return tags.length > 0 ? <div style={{marginTop: '4px'}}>{tags}</div> : null;
    };

    if (variant === "badge") {
        // Simple badge style for compact displays (like Dashboard)
        return (
            <Tag 
                color={isFill ? "blue" : "default"} 
                key={`ingredient-${ingredient.id}`} 
                style={{fontSize: "1rem", marginBottom: '4px'}}
            >
                {showIcon && <span style={{marginRight: '4px'}}>{icon}</span>}
                {ingredient.name}
            </Tag>
        );
    }

    if (variant === "compact") {
        // Compact inline style
        return (
            <span>
                {showIcon && <span style={{marginRight: '4px'}}>{icon}</span>}
                {ingredient.name}
                {showTags && getTags()}
            </span>
        );
    }

    // Default "card" variant - styled container
    const backgroundColor = isFill ? '#e6f7ff' : '#f0f0f0';
    const borderColor = isFill ? '#91d5ff' : '#d9d9d9';
    
    return (
        <div 
            style={{
                backgroundColor: backgroundColor,
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '6px',
                border: `1px solid ${borderColor}`
            }}
        >
            <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {showIcon && <span style={{fontSize: '1.2rem'}}>{icon}</span>}
                <span>{ingredient.name}</span>
            </div>
            {showTags && getTags()}
        </div>
    );
}
