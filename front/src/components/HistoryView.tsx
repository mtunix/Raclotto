import React, {useState, useEffect} from "react";
import {Api} from "../lib/api";
import {Card, Row, Col, Rate, Spin, Button, Typography, Space, Tag, message} from "antd";
import {Pan} from "../model/pan";
import {useTranslation} from "react-i18next";
import {useAppStore} from "../AppSlice";
import {IngredientDisplay} from "./common/IngredientDisplay";
import {VectorGraphics} from "../lib/vectorGraphics";

const {Title, Text} = Typography;

export function HistoryView() {
    let { t } = useTranslation();
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    let [pans, setPans] = useState<Pan[]>([]);
    let [waiting, setWaiting] = useState(true);
    let [cloningPanId, setCloningPanId] = useState<number | null>(null);

    useEffect(() => {
        if (sessionKey) {
            Api.get("pans", sessionKey).then((data) => {
                const pansData = Array.isArray(data) ? data as Pan[] : [];
                setPans(pansData.reverse());
                setWaiting(false);
            }).catch((error) => {
                console.error("Failed to load pans:", error);
                setPans([]);
                setWaiting(false);
            });
        }
    }, [sessionKey]);

    function onRating(id: number, rating: number) {
        if (!sessionKey) return;
        Api.rate(sessionKey, id, rating).then(() => {
            // Rating successfully submitted - update local state
            setPans(prevPans => prevPans.map(p => 
                p.id === id ? { ...p, rating } : p
            ));
        }).catch((error) => {
            console.error("Failed to submit rating:", error);
        });
    }
    
    function onClonePan(pan: Pan) {
        if (!sessionKey) return;
        setCloningPanId(pan.id);
        Api.clonePan(sessionKey, pan).then(() => {
            message.success(t("history.panCloned") || "Pan cloned successfully");
            // Refresh the pans list
            Api.get("pans", sessionKey).then((data) => {
                const pansData = Array.isArray(data) ? data as Pan[] : [];
                setPans(pansData.reverse());
            }).catch((error) => {
                console.error("Failed to refresh pans:", error);
            });
        }).catch((error) => {
            console.error("Failed to clone pan:", error);
            message.error(t("history.panCloneFailed") || "Failed to clone pan");
        }).finally(() => {
            setCloningPanId(null);
        });
    }

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    const renderPanCard = (pan: Pan) => {
        return (
            <Col xs={24} sm={24} md={12} lg={8} key={pan.id}>
                <Card
                    hoverable
                    style={{
                        height: '100%',
                        marginBottom: '16px',
                        border: '1px solid #d9d9d9'
                    }}
                    bodyStyle={{ padding: '12px' }}
                >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {/* Header with name and rating */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Space direction="vertical" size={0} style={{ flex: 1 }}>
                                <Title level={4} style={{ margin: 0, fontSize: '1rem', marginBottom: '4px' }}>
                                    {pan.name}
                                </Title>
                                <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                                    {t("history.consumedBy")} <strong>{pan.user}</strong>
                                </Text>
                                <Text type="secondary" style={{ fontSize: '0.7rem' }}>
                                    {t("history.consumedAt")} {formatDate(pan.timestamp)}
                                </Text>
                            </Space>
                            <div style={{ textAlign: 'right', marginLeft: '8px' }}>
                                <Rate
                                    value={pan.rating}
                                    onChange={(rating: number) => onRating(pan.id, rating)}
                                    allowHalf
                                    style={{ fontSize: '0.9rem' }}
                                />
                                {pan.rating > 0 && (
                                    <div style={{ marginTop: '2px' }}>
                                        <Tag color="gold" style={{ fontSize: '0.7rem' }}>
                                            {pan.rating.toFixed(1)}
                                        </Tag>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* All Ingredients */}
                        <div>
                            {pan.ingredients.length > 0 ? (
                                <Space wrap size="small">
                                    {pan.ingredients.map((ingredient) => (
                                        <IngredientDisplay 
                                            key={ingredient.id}
                                            ingredient={ingredient}
                                            variant="badge"
                                            showTags={false}
                                            showIcon={true}
                                        />
                                    ))}
                                </Space>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                                    {t("ingredient.noIngredients") || "No ingredients"}
                                </Text>
                            )}
                        </div>

                        {/* Action button */}
                        <Button 
                            type="primary" 
                            block 
                            size="small" 
                            style={{ marginTop: '4px' }}
                            onClick={() => onClonePan(pan)}
                            loading={cloningPanId === pan.id}
                            disabled={cloningPanId !== null}
                        >
                            {t("history.iWantThisToo")}
                        </Button>
                    </Space>
                </Card>
            </Col>
        );
    };

    return (
        <div>
            {pans.length > 0 ? (
                <Row gutter={[16, 16]}>
                    {pans.map(renderPanCard)}
                </Row>
            ) : (
                <Card>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>
                            {VectorGraphics.HISTORY}
                        </span>
                        <Text type="secondary">
                            {t("history.noPans") || "No pans in history"}
                        </Text>
                    </div>
                </Card>
            )}
        </div>
    );
}

