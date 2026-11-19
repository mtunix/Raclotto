import React, {useState, useCallback} from "react";
import {Segmented, Card, Row, Col, message, List, Button, Input, Space, Empty, Spin, Typography} from "antd";
import {useTranslation} from "react-i18next";
import axios from "axios";
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
    ErrorResponseDto,
    IngredientForUserDto,
    PrepTypeDto,
    UpdateIngredientBody,
} from "../../../api/generated/model";
import {ingredientCatalog} from "../ingredientCatalog";
import {IngredientListView} from "./IngredientListView";
import {AddIngredientModal} from "./AddIngredientModal";
import {EditIngredientModal} from "./EditIngredientModal";
import {ConfirmDeleteButton} from "../../../shared/ConfirmDeleteButton";
import "../../../shared/MainScreen/MainScreen.css";

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
    
    React.useEffect(() => {
        if (ingredientsError && sessionKey) {
            message.error(t("ingredient.loadFailed") || "Failed to load ingredients");
        }
    }, [ingredientsError, sessionKey, t]);

    const onDelete = useCallback((ingredient: IngredientForUserDto) => {
        if (sessionKey) {
            ingredientCatalog.remove(sessionKey, ingredient.id).catch((error) => {
                console.error("Failed to delete ingredient:", error);
            });
        }
    }, [sessionKey]);

    const onRefill = useCallback((ingredient: IngredientForUserDto) => {
        if (sessionKey) {
            ingredientCatalog.refill(sessionKey, ingredient.id).catch((error) => {
                console.error("Failed to refill ingredient:", error);
            });
        }
    }, [sessionKey]);

    const onEdit = useCallback((ingredient: IngredientForUserDto) => {
        setEditingIngredient(ingredient);
        setIsEditModalVisible(true);
    }, []);

    const handleEditSave = useCallback(async (ingredientId: number, data: UpdateIngredientBody) => {
        await ingredientCatalog.update(sessionKey, ingredientId, data);
    }, [sessionKey]);

    const handleEditCancel = useCallback(() => {
        setIsEditModalVisible(false);
        setEditingIngredient(null);
    }, []);

    const handleAddIngredientClick = useCallback((type: IngredientType) => {
        setAddIngredientModalType(type);
        setIsAddIngredientModalVisible(true);
    }, []);

    const onPrepTypeDelete = useCallback((type: PrepTypeDto) => {
        if (!sessionKey) return;
        
        // Don't allow deleting default preparation types
        if (type.session_id === null || type.session_id === undefined) {
            message.warning(t("ingredient.cannotDeleteDefault") || "Cannot delete default preparation types");
            return;
        }
        
        deletePreparationType(type.id).then(() => {
            message.success(t("ingredient.preparationTypeDeleted") || "Preparation type deleted");
            void mutatePrepTypes(sessionKey);
        }).catch((error: unknown) => {
            console.error("Failed to delete prep type:", error);
            const detail = axios.isAxiosError<ErrorResponseDto>(error) ? error.response?.data?.errors?.[0]?.detail : null;
            const errorMessage = detail ||
                                (error instanceof Error ? error.message : null) ||
                                t("ingredient.deleteFailed") || "Failed to delete preparation type";
            message.error(errorMessage);
        });
    }, [sessionKey, t]);

    const onPrepTypeAddClick = useCallback(() => {
        setIsAddingPrepType(true);
        setNewPrepTypeName("");
    }, []);

    const onPrepTypeAddCancel = useCallback(() => {
        setIsAddingPrepType(false);
        setNewPrepTypeName("");
    }, []);

    const onPrepTypeAdd = useCallback(() => {
        if (!sessionKey || !newPrepTypeName.trim()) return;
        createPreparationType({name: newPrepTypeName.trim()}, {session_key: sessionKey}).then(() => {
            setIsAddingPrepType(false);
            setNewPrepTypeName("");
            void mutatePrepTypes(sessionKey);
        }).catch((error) => {
            console.error("Failed to add prep type:", error);
        });
    }, [sessionKey, newPrepTypeName]);

    const renderPrepTypes = useCallback(() => {
        return (
            <>
                {loadingPrepTypes ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin size="large" />
                    </div>
                ) : prepTypes.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={t("ingredient.noPrepTypes") || "No preparation types"}
                        style={{ padding: '40px 0' }}
                    />
                ) : (
                    <>
                        <List
                            dataSource={prepTypes}
                            renderItem={(prepType: PrepTypeDto) => (
                                <List.Item
                                    style={{
                                        backgroundColor: prepType.session_id === null || prepType.session_id === undefined 
                                            ? 'rgba(142, 142, 147, 0.08)' 
                                            : 'rgba(0, 113, 227, 0.08)',
                                        marginBottom: '12px',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        border: `1px solid ${prepType.session_id === null || prepType.session_id === undefined 
                                            ? 'rgba(142, 142, 147, 0.2)' 
                                            : 'rgba(0, 113, 227, 0.2)'}`
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
                                        <span style={{fontSize: "17px", flex: 1, minWidth: 0, fontWeight: 500, letterSpacing: '-0.022em'}}>
                                            {prepType.name}
                                            {(prepType.session_id === null || prepType.session_id === undefined) && (
                                                <Text type="secondary" style={{ fontSize: '15px', marginLeft: '8px' }}>
                                                    ({t("ingredient.default") || "Default"})
                                                </Text>
                                            )}
                                        </span>
                                        {(prepType.session_id !== null && prepType.session_id !== undefined) && (
                                            <ConfirmDeleteButton
                                                onConfirm={() => onPrepTypeDelete(prepType)}
                                                danger={true}
                                                className="prep-type-action-button"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}
                                            />
                                        )}
                                    </div>
                                </List.Item>
                            )}
                        />
                        {isAddingPrepType && (
                            <div style={{ 
                                backgroundColor: 'rgba(0, 113, 227, 0.08)',
                                marginTop: '16px',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(0, 113, 227, 0.2)'
                            }}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        size="large"
                                        placeholder={t("ingredient.preparationTypeName") || "Enter preparation type name"}
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
                                        {t("common.save") || "Save"}
                                    </Button>
                                    <Button 
                                        size="large"
                                        onClick={onPrepTypeAddCancel}
                                    >
                                        {t("common.cancel") || "Cancel"}
                                    </Button>
                                </Space.Compact>
                            </div>
                        )}
                    </>
                )}
            </>
        );
    }, [prepTypes, loadingPrepTypes, onPrepTypeDelete, onPrepTypeAdd, onPrepTypeAddCancel, isAddingPrepType, newPrepTypeName, t]);

    return (
        <div style={{ padding: '8px 0' }}>
            <Row gutter={[0, 24]}>
                <Col span={24}>
                    <Card 
                        bordered={false}
                        bodyStyle={{ padding: '24px' }}
                    >
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            marginBottom: '32px',
                            width: '100%'
                        }}>
                            <Segmented
                                value={activeSegment}
                                onChange={(value) => {
                                    setActiveSegment(value as 'ingredients' | 'sauces' | 'prepTypes');
                                }}
                                options={[
                                    {
                                        label: (
                                            <span className="segmented-label">
                                                {t("ingredient.ingredients") || "Ingredients"}
                                            </span>
                                        ),
                                        value: 'ingredients'
                                    },
                                    {
                                        label: (
                                            <span className="segmented-label">
                                                {t("ingredient.sauces") || "Sauces"}
                                            </span>
                                        ),
                                        value: 'sauces'
                                    },
                                    {
                                        label: (
                                            <span className="segmented-label">
                                                {t("ingredient.preparationTypes") || "Preparation Types"}
                                            </span>
                                        ),
                                        value: 'prepTypes'
                                    }
                                ]}
                                size="large"
                                className="main-screen-segmented"
                                style={{
                                    width: '100%',
                                    maxWidth: '600px'
                                }}
                            />
                        </div>
                        <div style={{
                            transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            minHeight: '200px'
                        }}>
                            {activeSegment === 'ingredients' && (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <Button
                                            type="dashed"
                                            size="large"
                                            onClick={() => handleAddIngredientClick(IngredientType.FILL)}
                                            block
                                        >
                                            {t("ingredient.addIngredient") || "Add Ingredient"}
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
                                    <div style={{ marginBottom: '16px' }}>
                                        <Button
                                            type="dashed"
                                            size="large"
                                            onClick={() => handleAddIngredientClick(IngredientType.SAUCE)}
                                            block
                                        >
                                            {t("ingredient.addSauce") || "Add Sauce"}
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
                                        <div style={{ marginBottom: '16px' }}>
                                            <Button
                                                type="dashed"
                                                size="large"
                                                onClick={onPrepTypeAddClick}
                                                block
                                            >
                                                {t("ingredient.addPreparationType") || "Add Preparation Type"}
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

