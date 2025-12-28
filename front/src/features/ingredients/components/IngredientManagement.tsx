import React, {useState, useCallback} from "react";
import {Segmented, Card, Row, Col, message, List, Button, Input, Space, Empty, Spin, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useIngredients, usePrepTypes, mutateIngredients, mutatePrepTypes} from "../../../lib/api/swrHooks";
import {useAppStore} from "../../../AppSlice";
import {Api} from "../../../lib/api";
import {Ingredient, IngredientType} from "../../../model/ingredient";
import {PrepType} from "../../../model/prepType";
import {IngredientListView} from "./IngredientListView";
import {AddIngredient} from "./AddIngredient";
import {EditIngredientModal} from "./EditIngredientModal";
import {ConfirmDeleteButton} from "../../../shared/components/ui/ConfirmDeleteButton";

const {Text} = Typography;

export function IngredientManagement() {
    const { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
    const [activeSegment, setActiveSegment] = useState<'ingredients' | 'sauces' | 'prepTypes'>('ingredients');
    const [ingredientType, setIngredientType] = useState<IngredientType>(IngredientType.FILL);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isAddingPrepType, setIsAddingPrepType] = useState(false);
    const [newPrepTypeName, setNewPrepTypeName] = useState("");
    
    const { data: ingredients = [], isLoading: loadingIngredients, error: ingredientsError } = useIngredients(sessionKey);
    const { data: prepTypes = [], isLoading: loadingPrepTypes } = usePrepTypes(sessionKey);
    
    React.useEffect(() => {
        if (ingredientsError && sessionKey) {
            message.error(t("ingredient.loadFailed") || "Failed to load ingredients");
        }
    }, [ingredientsError, sessionKey, t]);

    const onDelete = useCallback((ingredient: Ingredient) => {
        if (sessionKey) {
            Api.delete(sessionKey, ingredient).then(() => {
                mutateIngredients(sessionKey);
            }).catch((error) => {
                console.error("Failed to delete ingredient:", error);
            });
        }
    }, [sessionKey]);

    const onRefill = useCallback((ingredient: Ingredient) => {
        if (sessionKey) {
            Api.refill(sessionKey, ingredient).then(() => {
                mutateIngredients(sessionKey);
            }).catch((error) => {
                console.error("Failed to refill ingredient:", error);
            });
        }
    }, [sessionKey]);

    const onEdit = useCallback((ingredient: Ingredient) => {
        setEditingIngredient(ingredient);
        setIsEditModalVisible(true);
    }, []);

    const handleEditSave = useCallback(async (ingredientId: number, data: Partial<Ingredient>) => {
        await Api.updateIngredient(ingredientId, data);
        mutateIngredients(sessionKey);
    }, [sessionKey]);

    const handleEditCancel = useCallback(() => {
        setIsEditModalVisible(false);
        setEditingIngredient(null);
    }, []);

    const handleAddSuccess = useCallback(() => {
        setActiveTab('list');
    }, []);

    const onPrepTypeDelete = useCallback((type: PrepType) => {
        if (!sessionKey) return;
        
        // Don't allow deleting default preparation types
        if (type.session_id === null || type.session_id === undefined) {
            message.warning(t("ingredient.cannotDeleteDefault") || "Cannot delete default preparation types");
            return;
        }
        
        Api.delete(sessionKey, type).then(() => {
            message.success(t("ingredient.preparationTypeDeleted") || "Preparation type deleted");
            mutatePrepTypes(sessionKey);
        }).catch((error: any) => {
            console.error("Failed to delete prep type:", error);
            const errorMessage = error?.response?.data?.errors?.[0]?.detail || 
                                error?.message || 
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
        Api.add(sessionKey, { name: newPrepTypeName.trim() } as any, "preparation_type").then(() => {
            setIsAddingPrepType(false);
            setNewPrepTypeName("");
            mutatePrepTypes(sessionKey);
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
                            renderItem={(prepType: PrepType) => (
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
                        {isAddingPrepType ? (
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
                        ) : (
                            <Button 
                                type="dashed" 
                                block 
                                size="large"
                                onClick={onPrepTypeAddClick}
                                style={{ marginTop: '16px' }}
                            >
                                {t("ingredient.addPreparationType") || "Add Preparation Type"}
                            </Button>
                        )}
                    </>
                )}
            </>
        );
    }, [prepTypes, loadingPrepTypes, onPrepTypeDelete, onPrepTypeAddClick, onPrepTypeAdd, onPrepTypeAddCancel, isAddingPrepType, newPrepTypeName, t]);

    return (
        <div style={{ padding: '8px 0' }}>
            <Row gutter={[0, 24]}>
                <Col span={24}>
                    <Segmented
                        value={activeTab}
                        onChange={(value) => setActiveTab(value as 'list' | 'add')}
                        options={[
                            {
                                label: t("ingredient.ingredients") || "Ingredients",
                                value: 'list'
                            },
                            {
                                label: t("ingredient.addIngredient") || "Add Ingredient",
                                value: 'add'
                            }
                        ]}
                        size="large"
                        block
                        style={{ width: '100%' }}
                    />
                </Col>
            </Row>

            {activeTab === 'list' && (
                <Row gutter={[0, 24]} style={{ marginTop: '24px' }}>
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
                                        const segment = value as 'ingredients' | 'sauces' | 'prepTypes';
                                        setActiveSegment(segment);
                                        if (segment === 'ingredients') {
                                            setIngredientType(IngredientType.FILL);
                                        } else if (segment === 'sauces') {
                                            setIngredientType(IngredientType.SAUCE);
                                        }
                                    }}
                                    options={[
                                        {
                                            label: t("ingredient.ingredients") || "Ingredients",
                                            value: 'ingredients'
                                        },
                                        {
                                            label: t("ingredient.sauces") || "Sauces",
                                            value: 'sauces'
                                        },
                                        {
                                            label: t("ingredient.preparationTypes") || "Preparation Types",
                                            value: 'prepTypes'
                                        }
                                    ]}
                                    size="large"
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
                                    <IngredientListView
                                        ingredients={ingredients}
                                        loading={loadingIngredients}
                                        onDelete={onDelete}
                                        onRefill={onRefill}
                                        onEdit={onEdit}
                                        type={IngredientType.FILL}
                                    />
                                )}
                                {activeSegment === 'sauces' && (
                                    <IngredientListView
                                        ingredients={ingredients}
                                        loading={loadingIngredients}
                                        onDelete={onDelete}
                                        onRefill={onRefill}
                                        onEdit={onEdit}
                                        type={IngredientType.SAUCE}
                                    />
                                )}
                                {activeSegment === 'prepTypes' && renderPrepTypes()}
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            {activeTab === 'add' && (
                <Row gutter={[0, 24]} style={{ marginTop: '24px' }}>
                    <Col span={24}>
                        <AddIngredient onSuccess={handleAddSuccess} />
                    </Col>
                </Row>
            )}

            <EditIngredientModal
                ingredient={editingIngredient}
                visible={isEditModalVisible}
                onCancel={handleEditCancel}
                onSave={handleEditSave}
            />
        </div>
    );
}

