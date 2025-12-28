import React from "react";
import { IngredientModal } from "./IngredientModal";
import { Ingredient } from "../../../model/ingredient";

interface EditIngredientModalProps {
    ingredient: Ingredient | null;
    visible: boolean;
    onCancel: () => void;
    onSave: (ingredientId: number, data: Partial<Ingredient>) => Promise<void>;
}

export function EditIngredientModal(props: EditIngredientModalProps) {
    const { ingredient, visible, onCancel, onSave } = props;

    return (
        <IngredientModal
            visible={visible}
            onCancel={onCancel}
            mode="edit"
            ingredient={ingredient}
            onSave={onSave}
        />
    );
}
