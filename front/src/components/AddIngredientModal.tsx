import React from "react";
import {Modal} from "antd";
import {AddIngredient} from "./AddIngredient";
import {IngredientType} from "../model/ingredient";
import {useTranslation} from "react-i18next";

interface AddIngredientModalProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess?: () => void;
    initialType?: IngredientType;
}

export function AddIngredientModal(props: AddIngredientModalProps) {
    const { t } = useTranslation();
    const { visible, onCancel, onSuccess, initialType } = props;

    const handleSuccess = () => {
        if (onSuccess) {
            onSuccess();
        }
        onCancel();
    };

    const getTitle = () => {
        if (initialType === IngredientType.SAUCE) {
            return t("ingredient.addSauce") || "Add Sauce";
        }
        return t("ingredient.addIngredient") || "Add Ingredient";
    };

    return (
        <Modal
            title={getTitle()}
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={600}
            destroyOnClose={true}
        >
            <AddIngredient onSuccess={handleSuccess} initialType={initialType} />
        </Modal>
    );
}

