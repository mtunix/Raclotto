import { useState, useEffect } from "react";
import {Segmented, Card, Row, Col, message, Button, Input, Space, Empty, Spin, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {failureMessage} from "../../../lib/api/failedRequest";
import {mutatePrepTypes, onErrorRetry} from "../../../lib/api/swrHooks";
import {useAppStore} from "../../../AppSlice";
import {useListIngredients} from "../../../api/generated/endpoints/ingredients/ingredients";
import {
    createPreparationType,
    deletePreparationType,
    useListPreparationTypes,
} from "../../../api/generated/endpoints/preparation-type/preparation-type";
import {IngredientType} from "../../../api/generated/model";
import type {
    IngredientForUserDto,
    PrepTypeDto,
    UpdateIngredientBody,
} from "../../../api/generated/model";
import {ingredientCatalog} from "../ingredientCatalog";
import {IngredientListView} from "./IngredientListView";
import {AddIngredientModal} from "./AddIngredientModal";
import {EditIngredientModal} from "./EditIngredientModal";
import {ConfirmDeleteButton} from "../../../shared/ConfirmDeleteButton";
import {ItemList, ItemRow} from "../../../shared/ItemList/ItemList";
import "../../../shared/MainScreen/MainScreen.css";
import "./KitchenManagement.css";

const {Text} = Typography;

export function KitchenManagement() {
    const { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const [activeSegment, setActiveSegment] = useState<'ingredients' | 'sauces' | 'prepTypes'>('ingredients');
    const [editingIngredient, setEditingIngredient] = useState<IngredientForUserDto | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isAddIngredientModalVisible, setIsAddIngredientModalVisible] = useState(false);
    const [addIngredientModalType, setAddIngredientModalType] = useState<IngredientType>(IngredientType.FILL);
    const [isAddingPrepType, setIsAddingPrepType] = useState(false);
    const [newPrepTypeName, setNewPrepTypeName] = useState("");
    
    const swr = {enabled: !!sessionKey, onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true};
    const { data: ingredients = [], isLoading: loadingIngredients, error: ingredientsError } =
        useListIngredients({session_key: sessionKey}, {swr});
    const { data: prepTypes = [], isLoading: loadingPrepTypes } =
        useListPreparationTypes({session_key: sessionKey}, {swr});
    
    useEffect(() => {
        if (ingredientsError && sessionKey) {
            message.error(t("ingredient.loadFailed"));
        }
    }, [ingredientsError, sessionKey, t]);

    const onDelete = (ingredient: IngredientForUserDto) => {
        if (sessionKey) {
            ingredientCatalog.remove(sessionKey, ingredient.id).catch((error) => {
                console.error("Failed to delete ingredient:", error);
            });
        }
    };

    const onRefill = (ingredient: IngredientForUserDto) => {
        if (sessionKey) {
            ingredientCatalog.refill(sessionKey, ingredient.id).catch((error) => {
                console.error("Failed to refill ingredient:", error);
            });
        }
    };

    const onEdit = (ingredient: IngredientForUserDto) => {
        setEditingIngredient(ingredient);
        setIsEditModalVisible(true);
    };

    const handleEditSave = async (ingredientId: number, data: UpdateIngredientBody) => {
        await ingredientCatalog.update(sessionKey, ingredientId, data);
    };

    const handleEditCancel = () => {
        setIsEditModalVisible(false);
        setEditingIngredient(null);
    };

    const handleAddIngredientClick = (type: IngredientType) => {
        setAddIngredientModalType(type);
        setIsAddIngredientModalVisible(true);
    };

    const onPrepTypeDelete = (type: PrepTypeDto) => {
        if (!sessionKey) return;
        
        // Don't allow deleting default preparation types
        if (type.session_id === null || type.session_id === undefined) {
            message.warning(t("ingredient.cannotDeleteDefault"));
            return;
        }
        
        deletePreparationType(type.id).then(() => {
            message.success(t("ingredient.preparationTypeDeleted"));
            void mutatePrepTypes(sessionKey);
        }).catch((error: unknown) => {
            console.error("Failed to delete prep type:", error);
            message.error(failureMessage(error, t, t("ingredient.deleteFailed")));
        });
    };

    const onPrepTypeAddClick = () => {
        setIsAddingPrepType(true);
        setNewPrepTypeName("");
    };

    const onPrepTypeAddCancel = () => {
        setIsAddingPrepType(false);
        setNewPrepTypeName("");
    };

    const onPrepTypeAdd = () => {
        if (!sessionKey || !newPrepTypeName.trim()) return;
        createPreparationType({name: newPrepTypeName.trim()}, {session_key: sessionKey}).then(() => {
            setIsAddingPrepType(false);
            setNewPrepTypeName("");
            void mutatePrepTypes(sessionKey);
        }).catch((error) => {
            console.error("Failed to add prep type:", error);
        });
    };

    const renderPrepTypes = () => {
        return (
            <>
                {loadingPrepTypes ? (
                    <div className="empty-state">
                        <Spin size="large" />
                    </div>
                ) : prepTypes.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={t("ingredient.noPrepTypes")}
                        className="kitchen-empty"
                    />
                ) : (
                    <>
                        <ItemList
                            items={prepTypes}
                            rowKey={(prepType) => prepType.id}
                            renderItem={(prepType: PrepTypeDto) => (
                                <ItemRow
                                    className={prepType.session_id == null ? "kitchen-prep-type kitchen-prep-type-default" : "kitchen-prep-type"}
                                >
                                    <div className="kitchen-prep-type-content">
                                        <span className="kitchen-prep-type-name">
                                            {prepType.name}
                                            {(prepType.session_id === null || prepType.session_id === undefined) && (
                                                <Text type="secondary" className="kitchen-prep-type-default-note">
                                                    ({t("ingredient.default")})
                                                </Text>
                                            )}
                                        </span>
                                        {(prepType.session_id !== null && prepType.session_id !== undefined) && (
                                            <ConfirmDeleteButton
                                                onConfirm={() => onPrepTypeDelete(prepType)}
                                                label={t("ingredient.deletePreparationType")}
                                                danger={true}
                                                className="prep-type-action-button"
                                            />
                                        )}
                                    </div>
                                </ItemRow>
                            )}
                        />
                        {isAddingPrepType && (
                            <div className="kitchen-prep-type-new">
                                <Space.Compact className="full-width">
                                    <Input
                                        size="large"
                                        placeholder={t("ingredient.preparationTypeName")}
                                        value={newPrepTypeName}
                                        onChange={(e) => setNewPrepTypeName(e.target.value)}
                                        onPressEnter={onPrepTypeAdd}
                                        // eslint-disable-next-line jsx-a11y-x/no-autofocus -- the field appears because the user asked to add a type
                                        autoFocus
                                    />
                                    <Button 
                                        type="primary"
                                        size="large"
                                        onClick={onPrepTypeAdd}
                                        disabled={!newPrepTypeName.trim()}
                                    >
                                        {t("common.save")}
                                    </Button>
                                    <Button 
                                        size="large"
                                        onClick={onPrepTypeAddCancel}
                                    >
                                        {t("common.cancel")}
                                    </Button>
                                </Space.Compact>
                            </div>
                        )}
                    </>
                )}
            </>
        );
    };

    return (
        <div className="kitchen">
            <Row gutter={[0, 24]}>
                <Col span={24}>
                    <Card 
                        variant="borderless"
                        classNames={{ body: "kitchen-card-body" }}
                    >
                        <div className="kitchen-segments">
                            <Segmented
                                value={activeSegment}
                                onChange={(value) => {
                                    setActiveSegment(value as 'ingredients' | 'sauces' | 'prepTypes');
                                }}
                                options={[
                                    {
                                        label: (
                                            <span className="segmented-label">
                                                {t("ingredient.ingredients")}
                                            </span>
                                        ),
                                        value: 'ingredients'
                                    },
                                    {
                                        label: (
                                            <span className="segmented-label">
                                                {t("ingredient.sauces")}
                                            </span>
                                        ),
                                        value: 'sauces'
                                    },
                                    {
                                        label: (
                                            <span className="segmented-label">
                                                {t("ingredient.preparationTypes")}
                                            </span>
                                        ),
                                        value: 'prepTypes'
                                    }
                                ]}
                                size="large"
                                className="main-screen-segmented kitchen-segmented"
                            />
                        </div>
                        <div className="kitchen-panel">
                            {activeSegment === 'ingredients' && (
                                <>
                                    <div className="mb-16">
                                        <Button
                                            type="dashed"
                                            size="large"
                                            onClick={() => handleAddIngredientClick(IngredientType.FILL)}
                                            block
                                        >
                                            {t("ingredient.addIngredient")}
                                        </Button>
                                    </div>
                                    <IngredientListView
                                        ingredients={ingredients}
                                        loading={loadingIngredients}
                                        onDelete={onDelete}
                                        onRefill={onRefill}
                                        onEdit={onEdit}
                                        type={IngredientType.FILL}
                                    />
                                </>
                            )}
                            {activeSegment === 'sauces' && (
                                <>
                                    <div className="mb-16">
                                        <Button
                                            type="dashed"
                                            size="large"
                                            onClick={() => handleAddIngredientClick(IngredientType.SAUCE)}
                                            block
                                        >
                                            {t("ingredient.addSauce")}
                                        </Button>
                                    </div>
                                    <IngredientListView
                                        ingredients={ingredients}
                                        loading={loadingIngredients}
                                        onDelete={onDelete}
                                        onRefill={onRefill}
                                        onEdit={onEdit}
                                        type={IngredientType.SAUCE}
                                    />
                                </>
                            )}
                            {activeSegment === 'prepTypes' && (
                                <>
                                    {!isAddingPrepType && (
                                        <div className="mb-16">
                                            <Button
                                                type="dashed"
                                                size="large"
                                                onClick={onPrepTypeAddClick}
                                                block
                                            >
                                                {t("ingredient.addPreparationType")}
                                            </Button>
                                        </div>
                                    )}
                                    {renderPrepTypes()}
                                </>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>

            <AddIngredientModal
                visible={isAddIngredientModalVisible}
                onCancel={() => setIsAddIngredientModalVisible(false)}
                initialType={addIngredientModalType}
                context={activeSegment === 'sauces' ? 'sauces' : 'ingredients'}
            />

            <EditIngredientModal
                ingredient={editingIngredient}
                visible={isEditModalVisible}
                onCancel={handleEditCancel}
                onSave={handleEditSave}
            />
        </div>
    );
}

