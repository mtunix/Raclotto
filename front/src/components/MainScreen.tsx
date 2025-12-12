import React, {useCallback, useEffect, useState} from "react";
import {Button, Collapse, List, Row, Col, Card, Typography, Input, Space, message, Empty, Badge, Spin} from "antd";
import {EditOutlined} from "@ant-design/icons";
import {Api} from "../lib/api";
import {Toolbar} from "./Toolbar";
import {EventDisplay} from "./EventDisplay";
import {VectorGraphics} from "../lib/vectorGraphics";
import {useAppStore} from "../AppSlice";
import {useSearchParams, useNavigate, useParams, Outlet, useLocation} from "react-router-dom";
import {Ingredient, IngredientType} from "../model/ingredient";
import {PrepType} from "../model/prepType";
import {Event} from "../model/event";
import {useTranslation} from "react-i18next";
import {IngredientDisplay} from "./common/IngredientDisplay";
import {useInterval} from "../lib/useInterval";
import {ConfirmDeleteButton} from "./ConfirmDeleteButton";
import {EditIngredientModal} from "./EditIngredientModal";
import "./MainScreen.css";

const {Text} = Typography;

interface IngredientListGroupItemProps {
    ingredient: Ingredient;
    available: boolean;
    onDelete?: () => void;
    onRefill?: () => void;
    onEdit?: () => void;
}

function IngredientListGroupItem(props: IngredientListGroupItemProps) {
    const { t } = useTranslation();
    const isApplicable = props.ingredient.applicable !== false;
    const backgroundColor = props.available 
        ? (props.ingredient.type === IngredientType.FILL ? '#e6f7ff' : '#f0f0f0')
        : '#fff1f0';
    
    // Make non-applicable ingredients more muted
    const opacity = isApplicable ? 1 : 0.6;

    return (
        <List.Item
            className="ingredient-list-item"
            style={{
                backgroundColor: backgroundColor,
                marginBottom: '8px',
                borderRadius: '6px',
                padding: '12px',
                opacity: opacity,
                border: `1px solid ${props.available 
                    ? (props.ingredient.type === IngredientType.FILL ? '#91d5ff' : '#d9d9d9')
                    : '#ffccc7'
                }`
            }}
        >
            <div style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                gap: '12px',
                flexWrap: 'nowrap'
            }}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <IngredientDisplay 
                        ingredient={props.ingredient}
                        variant="compact"
                        showTags={true}
                        showIcon={true}
                    />
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {props.onEdit && (
                        <Button
                            type="text"
                            size="small"
                            className="ingredient-action-button"
                            icon={<EditOutlined />}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                            onClick={props.onEdit}
                            title={t("common.edit") || "Edit"}
                        />
                    )}
                    {props.available && props.onDelete && (
                        <ConfirmDeleteButton
                            onConfirm={props.onDelete}
                            danger={true}
                            className="ingredient-action-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        />
                    )}
                    {!props.available && props.onRefill && (
                        <ConfirmDeleteButton
                            onConfirm={props.onRefill}
                            danger={false}
                            className="ingredient-action-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                            icon={VectorGraphics.REPEAT}
                        />
                    )}
                </div>
            </div>
        </List.Item>
    );
}

type MainScreenProps = {
    onSessionClosed?: () => void;
};

export function MainScreen(props: MainScreenProps) {
    const { t } = useTranslation();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [prepTypes, setPrepTypes] = useState<PrepType[]>([]);
    const [isAddingPrepType, setIsAddingPrepType] = useState(false);
    const [newPrepTypeName, setNewPrepTypeName] = useState("");
    const [events, setEvents] = useState<Event[]>([]);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [loadingIngredients, setLoadingIngredients] = useState(false);
    const [loadingPrepTypes, setLoadingPrepTypes] = useState(false);
    const session = useAppStore((state) => state.session);
    const settingsRefreshTrigger = useAppStore((state) => state.settingsRefreshTrigger);
    const navigate = useNavigate();
    const {sessionId} = useParams<{sessionId: string}>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const popout = searchParams.get("popout") === "true";

    const sessionKey = session?.key || "";

    useEffect(() => {
        // Only redirect if we have both session and sessionId and they don't match
        // Don't redirect if session is still loading/being set
        // Give it a moment - SessionLayout should set the session
        if (session && sessionId && session.id.toString() !== sessionId) {
            // Session doesn't match URL - this shouldn't happen if SessionLayout is working
            // But give a small delay in case session is being updated
            const timeout = setTimeout(() => {
                if (session && session.id.toString() !== sessionId) {
            navigate("/");
                }
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [session, sessionId, navigate]);

    useEffect(() => {
        if (sessionKey) {
            setLoadingPrepTypes(true);
            Api.get("preparation_type", sessionKey).then((data) => {
                const prepTypesData = Array.isArray(data) ? data as PrepType[] : [];
                setPrepTypes(prepTypesData);
            }).catch((error) => {
                console.error("Failed to load prep types:", error);
                setPrepTypes([]);
            }).finally(() => {
                setLoadingPrepTypes(false);
            });
        }
    }, [sessionKey]);

    useEffect(() => {
        if (sessionKey) {
            setLoadingIngredients(true);
            Api.get("ingredients", sessionKey).then((data) => {
                const ingredientsData = Array.isArray(data) ? data as Ingredient[] : [];
                setIngredients(ingredientsData);
            }).catch((error) => {
                console.error("Failed to load ingredients:", error);
                message.error(t("ingredient.loadFailed") || "Failed to load ingredients");
                setIngredients([]);
            }).finally(() => {
                setLoadingIngredients(false);
            });
        }
    }, [sessionKey, settingsRefreshTrigger, t]);

    // Poll for events every 10 seconds
    const updateEvents = useCallback(() => {
        if (sessionKey) {
            Api.getEvents(sessionKey).then((eventsData) => {
                setEvents(eventsData);
            }).catch((error) => {
                console.error("Failed to load events:", error);
                setEvents([]);
            });
        }
    }, [sessionKey]);

    useEffect(() => {
        updateEvents();
    }, [updateEvents]);

    useInterval(() => {
        updateEvents();
    }, 10000); // Poll every 10 seconds

    const handleDismissEvent = useCallback((eventId: number) => {
        Api.dismissEvent(eventId).then(() => {
            // Remove dismissed event from local state
            setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
        }).catch((error) => {
            console.error("Failed to dismiss event:", error);
        });
    }, []);

    const onAdd = () => {
        if (sessionKey) {
            Api.get("ingredients", sessionKey).then((data) => {
                const ingredientsData = Array.isArray(data) ? data as Ingredient[] : [];
                setIngredients(ingredientsData);
            }).catch((error) => {
                console.error("Failed to refresh ingredients:", error);
            });
        }
    };

    const onDelete = useCallback((ingredient: Ingredient) => {
        if (sessionKey) {
            Api.delete(sessionKey, ingredient).then(() => {
                Api.get("ingredients", sessionKey).then((data) => {
                    const ingredientsData = Array.isArray(data) ? data as Ingredient[] : [];
                    setIngredients(ingredientsData);
                }).catch((error) => {
                    console.error("Failed to refresh ingredients after delete:", error);
                });
            }).catch((error) => {
                console.error("Failed to delete ingredient:", error);
            });
        }
    }, [sessionKey]);

    const onPrepTypeDelete = useCallback((type: PrepType) => {
        if (!sessionKey) return;
        
        // Don't allow deleting default preparation types
        if (type.session_id === null || type.session_id === undefined) {
            message.warning(t("ingredient.cannotDeleteDefault") || "Cannot delete default preparation types");
            return;
        }
        
        Api.delete(sessionKey, type).then(() => {
            message.success(t("ingredient.preparationTypeDeleted") || "Preparation type deleted");
            // Refresh prep types
            Api.get("preparation_type", sessionKey).then((data) => {
                const prepTypesData = Array.isArray(data) ? data as PrepType[] : [];
                setPrepTypes(prepTypesData);
            }).catch((error) => {
                console.error("Failed to refresh prep types:", error);
            });
        }).catch((error: any) => {
            console.error("Failed to delete prep type:", error);
            const errorMessage = error?.response?.data?.errors?.[0]?.detail || 
                                error?.message || 
                                t("ingredient.deleteFailed") || "Failed to delete preparation type";
            message.error(errorMessage);
        });
    }, [sessionKey, t]);

    const onRefill = useCallback((ingredient: Ingredient) => {
        if (sessionKey) {
            Api.refill(sessionKey, ingredient).then(() => {
                Api.get("ingredients", sessionKey).then((data) => {
                    const ingredientsData = Array.isArray(data) ? data as Ingredient[] : [];
                    setIngredients(ingredientsData);
                }).catch((error) => {
                    console.error("Failed to refresh ingredients after refill:", error);
                });
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
        if (sessionKey) {
            Api.get("ingredients", sessionKey).then((data) => {
                const ingredientsData = Array.isArray(data) ? data as Ingredient[] : [];
                setIngredients(ingredientsData);
            }).catch((error) => {
                console.error("Failed to refresh ingredients after update:", error);
            });
        }
    }, [sessionKey]);

    const handleEditCancel = useCallback(() => {
        setIsEditModalVisible(false);
        setEditingIngredient(null);
    }, []);

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
            Api.get("preparation_type", sessionKey).then((data) => {
                const prepTypesData = Array.isArray(data) ? data as PrepType[] : [];
                setPrepTypes(prepTypesData);
            }).catch((error) => {
                console.error("Failed to refresh prep types:", error);
            });
        }).catch((error) => {
            console.error("Failed to add prep type:", error);
        });
    }, [sessionKey, newPrepTypeName]);

    const renderPrepTypes = useCallback(() => {
        const collapseItems = [{
            key: 'preparation-type',
            label: (
                <Space>
                    <span style={{fontWeight: 600, fontSize: '1rem'}}>{t("ingredient.preparationTypes")}</span>
                    {prepTypes.length > 0 && (
                        <Badge count={prepTypes.length} showZero style={{ backgroundColor: '#1890ff' }} />
                    )}
                </Space>
            ),
            children: (
                <div>
                    {loadingPrepTypes ? (
                        <div style={{ textAlign: 'center', padding: '24px' }}>
                            <Spin />
                        </div>
                    ) : prepTypes.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={t("ingredient.noPrepTypes") || "No preparation types"}
                            style={{ padding: '24px 0' }}
                        />
                    ) : (
                        <>
                            {isAddingPrepType ? (
                                <div style={{ 
                                    backgroundColor: '#e6f7ff',
                                    marginBottom: '8px',
                                    borderRadius: '4px',
                                    padding: '12px'
                                }}>
                                    <Space.Compact style={{ width: '100%' }}>
                                        <Input
                                            placeholder={t("ingredient.preparationTypeName") || "Enter preparation type name"}
                                            value={newPrepTypeName}
                                            onChange={(e) => setNewPrepTypeName(e.target.value)}
                                            onPressEnter={onPrepTypeAdd}
                                            autoFocus
                                        />
                                        <Button 
                                            type="primary"
                                            onClick={onPrepTypeAdd}
                                            disabled={!newPrepTypeName.trim()}
                                        >
                                            {t("common.save") || "Save"}
                                        </Button>
                                        <Button 
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
                                    onClick={onPrepTypeAddClick}
                                    style={{ marginBottom: '8px' }}
                                >
                                    {t("ingredient.addPreparationType") || "Add Preparation Type"}
                                </Button>
                            )}
                            <List
                                dataSource={prepTypes}
                                renderItem={(prepType: PrepType) => (
                                    <List.Item
                                        style={{
                                            backgroundColor: prepType.session_id === null || prepType.session_id === undefined ? '#f0f0f0' : '#e6f7ff',
                                            marginBottom: '8px',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            border: `1px solid ${prepType.session_id === null || prepType.session_id === undefined ? '#d9d9d9' : '#91d5ff'}`
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
                                            <span style={{fontSize: "1rem", flex: 1, minWidth: 0, fontWeight: 500}}>
                                                {prepType.name}
                                                {(prepType.session_id === null || prepType.session_id === undefined) && (
                                                    <Text type="secondary" style={{ fontSize: '0.85rem', marginLeft: '8px' }}>
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
                        </>
                    )}
                </div>
            )
        }];

        return (
            <Card 
                bordered={false}
                className="main-screen-section-card"
            >
                <Collapse items={collapseItems} defaultActiveKey={['preparation-type']} />
            </Card>
        );
    }, [prepTypes, loadingPrepTypes, onPrepTypeDelete, onPrepTypeAddClick, onPrepTypeAdd, onPrepTypeAddCancel, isAddingPrepType, newPrepTypeName, t]);

    const renderIngredients = useCallback((type: IngredientType) => {
        let typeStr = type === IngredientType.FILL ? t("ingredient.ingredients") : t("ingredient.sauces");

        const filteredIngredients = ingredients.filter(ingredient => ingredient.type === type);
        
        // Separate by available status and applicability
        const availableApplicable = filteredIngredients.filter(ingredient => 
            ingredient.available && (ingredient.applicable !== false)
        );
        const availableNonApplicable = filteredIngredients.filter(ingredient => 
            ingredient.available && ingredient.applicable === false
        );
        const unavailableIngredients = filteredIngredients.filter(ingredient => !ingredient.available);

        const collapseItems = [
            {
                key: `ingredients-${type}`,
                label: (
                    <Space>
                        <span style={{fontWeight: 600, fontSize: '1rem'}}>{typeStr}</span>
                        {availableApplicable.length > 0 && (
                            <Badge count={availableApplicable.length} showZero style={{ backgroundColor: type === IngredientType.FILL ? '#1890ff' : '#8c8c8c' }} />
                        )}
                    </Space>
                ),
                children: loadingIngredients ? (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                        <Spin />
                    </div>
                ) : availableApplicable.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={type === IngredientType.FILL 
                            ? (t("ingredient.noIngredients") || "No ingredients")
                            : (t("ingredient.noSauces") || "No sauces")
                        }
                        style={{ padding: '24px 0' }}
                    />
                ) : (
                    <List
                        dataSource={availableApplicable}
                        renderItem={(ingredient: Ingredient) => (
                            <IngredientListGroupItem
                                ingredient={ingredient}
                                onDelete={() => onDelete(ingredient)}
                                onEdit={() => onEdit(ingredient)}
                                available={ingredient.available}
                            />
                        )}
                    />
                )
            }
        ];

        // Add non-applicable ingredients in a collapsible section at the bottom
        if (availableNonApplicable.length > 0) {
            collapseItems.push({
                key: `ingredients-${type}-non-applicable`,
                label: (
                    <Space>
                        <span style={{fontWeight: 500, color: '#8c8c8c', fontSize: '0.9rem'}}>
                            {t("ingredient.nonApplicable") || "Not applicable for your diet"}
                        </span>
                        <Badge count={availableNonApplicable.length} showZero style={{ backgroundColor: '#8c8c8c' }} />
                    </Space>
                ),
                children: (
                    <List
                        dataSource={availableNonApplicable}
                        renderItem={(ingredient: Ingredient) => (
                            <IngredientListGroupItem
                                ingredient={ingredient}
                                onDelete={() => onDelete(ingredient)}
                                onEdit={() => onEdit(ingredient)}
                                available={ingredient.available}
                            />
                        )}
                    />
                )
            });
        }

        // Add unavailable ingredients
        if (unavailableIngredients.length > 0) {
            collapseItems.push({
                key: `ingredients-${type}-unavailable`,
                label: (
                    <Space>
                        <span style={{fontWeight: 500, color: '#ff4d4f', fontSize: '0.9rem'}}>
                            {t("ingredient.unavailable") || "Unavailable"}
                        </span>
                        <Badge count={unavailableIngredients.length} showZero style={{ backgroundColor: '#ff4d4f' }} />
                    </Space>
                ),
                children: (
                    <List
                        dataSource={unavailableIngredients}
                        renderItem={(ingredient: Ingredient) => (
                            <IngredientListGroupItem
                                ingredient={ingredient}
                                onRefill={() => onRefill(ingredient)}
                                onEdit={() => onEdit(ingredient)}
                                available={ingredient.available}
                            />
                        )}
                    />
                )
            });
        }

        return (
            <Card 
                bordered={false}
                className="main-screen-section-card"
            >
                <Collapse items={collapseItems} defaultActiveKey={[`ingredients-${type}`]} />
            </Card>
        );
    }, [ingredients, loadingIngredients, onDelete, onRefill, onEdit, t]);

    // Show loading state if session is not yet available
    // SessionLayout should have validated it, but it might still be loading from API on refresh
    if (!session) {
        // SessionLayout is responsible for loading the session
        // If we get here, it means SessionLayout rendered <Outlet/> but session isn't in store yet
        // This can happen briefly when session is being set in useEffect
        // Show a brief loading state
        return (
            <div style={{margin: "10px"}}>
                <Card>
                    <p>{t("session.loading") || "Loading session..."}</p>
                </Card>
            </div>
        );
    }

    return (
        <div style={{margin: "10px", paddingBottom: '24px'}}>
            <Row gutter={[0, 16]}>
                <Col span={24}>
                    <Toolbar
                        ingredients={ingredients}
                        session={sessionKey}
                        sessionId={sessionId || ""}
                        sessionClosed={props.onSessionClosed || (() => {})}
                        onAdd={onAdd}
                        sessionName={session?.name}
                    />
                </Col>
            </Row>
            <Row gutter={[0, 16]}>
                <Col span={24}>
                    <EventDisplay
                        events={events}
                        onDismiss={handleDismissEvent}
                    />
                </Col>
            </Row>
            <Row gutter={[0, 16]} style={{ marginTop: '16px' }}>
                <Col span={24}>
                    {(() => {
                        const path = location.pathname;
                        
                        // Determine title based on route
                        let title: string | undefined;
                        if (path.includes("/generate")) {
                            title = t("toolbar.generateTitle");
                        } else if (path.includes("/settings")) {
                            title = t("toolbar.userSettingsTitle");
                        } else if (path.includes("/history")) {
                            title = t("toolbar.historyTitle");
                        } else if (path.includes("/add")) {
                            title = t("toolbar.addIngredientTitle");
                        } else if (path.includes("/achievements")) {
                            title = t("toolbar.achievementsTitle");
                        } else if (path.includes("/dashboard")) {
                            title = t("toolbar.dashboardTitle") || "Dashboard";
                        }
                        
                        // If there's a title, wrap the Outlet in a Card
                        if (title) {
                            return (
                                <Card
                                    title={<span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{title}</span>}
                                    style={{ 
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                    }}
                                >
                                    <Outlet/>
                                </Card>
                            );
                        }
                        
                        // Base route or no title - just render Outlet (which will be empty for base route)
                        return <Outlet/>;
                    })()}
                </Col>
            </Row>
            {!popout && (
                <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
                    <Col xs={24} sm={24} md={12} lg={8}>
                        {renderIngredients(IngredientType.FILL)}
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={8}>
                        {renderIngredients(IngredientType.SAUCE)}
                    </Col>
                    <Col xs={24} sm={24} md={24} lg={8}>
                        {renderPrepTypes()}
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
