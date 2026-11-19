import { IngredientModal } from "./IngredientModal";
import type { IngredientForUserDto, UpdateIngredientBody } from "../../../api/generated/model";

interface EditIngredientModalProps {
    ingredient: IngredientForUserDto | null;
    visible: boolean;
    onCancel: () => void;
    onSave: (ingredientId: number, data: UpdateIngredientBody) => Promise<void>;
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
