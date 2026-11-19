import { useState, useEffect } from "react";
import {Segmented, Card, Row, Col, message, Button, Input, Space, Empty, Spin, Typography} from "antd";
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
import {ItemList, ItemRow} from "../../../shared/ItemList/ItemList";
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
            const detail = axios.isAxiosError<ErrorResponseDto>(error) ? error.response?.data?.errors?.[0]?.detail : null;
            const errorMessage = detail ||
                                (error instanceof Error ? error.message : null) ||
                                t("ingredient.deleteFailed");
            message.error(errorMessage);
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
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin size="large" />
                    </div>
                ) : prepTypes.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={t("ingredient.noPrepTypes")}
                        style={{ padding: '40px 0' }}
                    />
                ) : (
                    <>
                        <ItemList
                            items={prepTypes}
                            rowKey={(prepType) => prepType.id}
                            renderItem={(prepType: PrepTypeDto) => (
                                <ItemRow
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
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}
                                            />
                                        )}
                                    </div>
                                </ItemRow>
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
        <div style={{ padding: '8px 0' }}>
            <Row gutter={[0, 24]}>
                <Col span={24}>
                    <Card 
                        variant="borderless"
                        styles={{ body: { padding: '24px' } }}
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
                                    <div style={{ marginBottom: '16px' }}>
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
                                        <div style={{ marginBottom: '16px' }}>
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

