import React from "react";
import { IngredientModal } from "./IngredientModal";
import { IngredientType } from "../../../model/ingredient";

interface AddIngredientModalProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess?: () => void;
    initialType?: IngredientType;
    context?: 'ingredients' | 'sauces';
}

export function AddIngredientModal(props: AddIngredientModalProps) {
    const { visible, onCancel, onSuccess, initialType, context } = props;

    const handleSuccess = () => {
        if (onSuccess) {
            onSuccess();
        }
        onCancel();
    };

    return (
        <IngredientModal
            visible={visible}
            onCancel={onCancel}
            mode="add"
            onSuccess={handleSuccess}
            initialType={initialType}
            context={context}
        />
    );
}

