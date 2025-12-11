import React, {useCallback, useEffect, useState} from "react";
import {Button, Collapse, List, Row, Col, Card, Typography, Input, Space, message} from "antd";
import {Api} from "../lib/api";
import {Toolbar} from "./Toolbar";
import {VectorGraphics} from "../lib/vectorGraphics";
import {useAppStore} from "../AppSlice";
import {useSearchParams, useNavigate, useParams, Outlet, useLocation} from "react-router-dom";
import {Ingredient, IngredientType} from "../model/ingredient";
import {PrepType} from "../model/prepType";
import {useTranslation} from "react-i18next";
import {IngredientDisplay} from "./common/IngredientDisplay";

const {Text} = Typography;

interface IngredientListGroupItemProps {
    ingredient: Ingredient;
    available: boolean;
    onClick?: () => void;
}

function IngredientListGroupItem(props: IngredientListGroupItemProps) {
    const isApplicable = props.ingredient.applicable !== false;
    const backgroundColor = props.available 
        ? (props.ingredient.type === IngredientType.FILL ? '#e6f7ff' : '#f0f0f0')
        : '#fff1f0';
    
    // Make non-applicable ingredients more muted
    const opacity = isApplicable ? 1 : 0.6;

    return (
        <List.Item
            style={{
                backgroundColor: backgroundColor,
                marginBottom: '8px',
                borderRadius: '4px',
                padding: '12px',
                opacity: opacity
            }}
        >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <IngredientDisplay 
                        ingredient={props.ingredient}
                        variant="compact"
                        showTags={true}
                        showIcon={true}
                    />
                </div>
                    {props.onClick && (
                        <Button 
                            type="text"
                            danger={props.available}
                            size="small"
                            style={{fontSize: "0.7rem", marginLeft: '8px'}}
                            onClick={props.onClick}
                        >
                            {props.available ? VectorGraphics.REMOVE : VectorGraphics.REPEAT}
                        </Button>
                    )}
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
    const session = useAppStore((state) => state.session);
    const clearSession = useAppStore((state) => state.clearSession);
    const settingsRefreshTrigger = useAppStore((state) => state.settingsRefreshTrigger);
    const navigate = useNavigate();
    const {sessionId} = useParams<{sessionId: string}>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const popout = searchParams.get("popout") === "true";

    const sessionKey = session?.key || "";

    const handleLeaveSession = () => {
        clearSession();
        navigate("/");
    };

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
            Api.get("preparation_type", sessionKey).then((data) => {
                const prepTypesData = Array.isArray(data) ? data as PrepType[] : [];
                setPrepTypes(prepTypesData);
            }).catch(() => {
                // preparation_type endpoint might not exist
                setPrepTypes([]);
            });
        }
    }, [sessionKey]);

    useEffect(() => {
        if (sessionKey) {
            Api.get("ingredients", sessionKey).then((data) => {
                const ingredientsData = Array.isArray(data) ? data as Ingredient[] : [];
                setIngredients(ingredientsData);
            }).catch((error) => {
                console.error("Failed to load ingredients:", error);
                setIngredients([]);
            });
        }
    }, [sessionKey, settingsRefreshTrigger]);

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
            label: <span style={{fontWeight: 800}}>{t("ingredient.preparationTypes")}</span>,
            children: (
                <div>
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
                    {prepTypes.length > 0 ? (
                        <List
                            dataSource={prepTypes}
                            renderItem={(prepType: PrepType) => (
                                <List.Item
                                    style={{
                                        backgroundColor: prepType.session_id === null || prepType.session_id === undefined ? '#f0f0f0' : '#e6f7ff',
                                        marginBottom: '8px',
                                        borderRadius: '4px',
                                        padding: '12px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <span style={{fontSize: "1rem"}}>
                                            {prepType.name}
                                            {(prepType.session_id === null || prepType.session_id === undefined) && (
                                                <Text type="secondary" style={{ fontSize: '0.85rem', marginLeft: '8px' }}>
                                                    ({t("ingredient.default") || "Default"})
                                                </Text>
                                            )}
                                        </span>
                                        {(prepType.session_id !== null && prepType.session_id !== undefined) && (
                                            <Button 
                                                type="text"
                                                danger
                                                size="small"
                                                style={{fontSize: "0.7rem"}}
                                                onClick={() => onPrepTypeDelete(prepType)}
                                            >
                                                {VectorGraphics.REMOVE}
                                            </Button>
                                        )}
                                    </div>
                                </List.Item>
                            )}
                        />
                    ) : null}
                </div>
            )
        }];

        return (
            <Collapse items={collapseItems} defaultActiveKey={['preparation-type']} />
        );
    }, [prepTypes, onPrepTypeDelete, onPrepTypeAddClick, onPrepTypeAdd, onPrepTypeAddCancel, isAddingPrepType, newPrepTypeName, t]);

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
                label: <span style={{fontWeight: 800}}>{typeStr}</span>,
                children: (
                    <List
                        dataSource={availableApplicable}
                        renderItem={(ingredient: Ingredient) => (
                            <IngredientListGroupItem
                                ingredient={ingredient}
                                onClick={() => onDelete(ingredient)}
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
                    <span style={{fontWeight: 600, color: '#8c8c8c'}}>
                        {t("ingredient.nonApplicable") || "Not applicable for your diet"} ({availableNonApplicable.length})
                    </span>
                ),
                children: (
                    <List
                        dataSource={availableNonApplicable}
                        renderItem={(ingredient: Ingredient) => (
                            <IngredientListGroupItem
                                ingredient={ingredient}
                                onClick={() => onDelete(ingredient)}
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
                    <span style={{fontWeight: 600, color: '#ff4d4f'}}>
                        {t("ingredient.unavailable") || "Unavailable"} ({unavailableIngredients.length})
                    </span>
                ),
                children: (
                    <List
                        dataSource={unavailableIngredients}
                        renderItem={(ingredient: Ingredient) => (
                            <IngredientListGroupItem
                                ingredient={ingredient}
                                onClick={() => onRefill(ingredient)}
                                available={ingredient.available}
                            />
                        )}
                    />
                )
            });
        }

        return (
            <Collapse items={collapseItems} defaultActiveKey={[`ingredients-${type}`]} />
        );
    }, [ingredients, onDelete, onRefill, t]);

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
        <div style={{margin: "10px"}}>
            <Row style={{ marginTop: '16px', marginBottom: '16px' }}>
                <Col span={24}>
                    <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "10px" }}>
                        <Button type="default" onClick={handleLeaveSession}>
                            ← {t("session.leave")}
                        </Button>
                        <h4 style={{ margin: 0 }}>{t("session.session")}: {session.name}</h4>
                    </div>
                </Col>
            </Row>
            <Row style={{ marginTop: '16px' }}>
                <Col span={24}>
                    <Toolbar
                        ingredients={ingredients}
                        session={sessionKey}
                        sessionId={sessionId || ""}
                        sessionClosed={props.onSessionClosed || (() => {})}
                        onAdd={onAdd}
                    />
                </Col>
            </Row>
            <Row style={{ marginTop: '16px' }}>
                <Col span={24}>
                    {(() => {
                        const path = location.pathname;
                        
                        // Determine title based on route
                        let title: string | undefined;
                        if (path.includes("/generate")) {
                            title = t("toolbar.generateTitle");
                        } else if (path.includes("/settings") && !path.includes("/server-settings")) {
                            title = t("toolbar.userSettingsTitle");
                        } else if (path.includes("/history")) {
                            title = t("toolbar.historyTitle");
                        } else if (path.includes("/add")) {
                            title = t("toolbar.addIngredientTitle");
                        } else if (path.includes("/achievements")) {
                            title = t("toolbar.achievementsTitle");
                        } else if (path.includes("/server-settings")) {
                            title = t("toolbar.serverSettingsTitle");
                        } else if (path.includes("/invites")) {
                            title = t("toolbar.invitesTitle");
                        } else if (path.includes("/dashboard")) {
                            title = t("toolbar.dashboardTitle") || "Dashboard";
                        }
                        
                        // If there's a title, wrap the Outlet in a Card
                        if (title) {
                            return (
                                <Card
                                    title={<span style={{ fontWeight: 800 }}>{title}</span>}
                                    style={{ marginTop: '16px' }}
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
                <Row gutter={16} style={{ marginTop: '16px' }}>
                    <Col span={8}>
                        {renderIngredients(IngredientType.FILL)}
                    </Col>
                    <Col span={8}>
                        {renderIngredients(IngredientType.SAUCE)}
                    </Col>
                    <Col span={8}>
                        {renderPrepTypes()}
                    </Col>
                </Row>
            )}
        </div>
    );
}
