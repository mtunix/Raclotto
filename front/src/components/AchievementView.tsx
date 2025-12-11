import React, {useEffect, useState} from "react";
import {Spin, Card, Row, Col, Tag, Typography, Space, Progress} from "antd";
import {Api} from "../lib/api";
import {Achievement} from "../model/achievement";
import {VectorGraphics} from "../lib/vectorGraphics";
import {useTranslation} from "react-i18next";

const {Title, Text} = Typography;

type AchievementViewProps = {};

export function AchievementView(props: AchievementViewProps) {
    const {t} = useTranslation();
    let [achievements, setAchievements] = useState<Achievement[]>([]);
    let [waiting, setWaiting] = useState(true);

    useEffect(() => {
        Api.get("achievements").then((data) => {
            console.log("Raw API response from Api.get:", data);
            
            // The deserialize-json-api library should flatten attributes
            // But we need to handle the case where it might not
            let achievementsData: Achievement[] = [];
            
            if (Array.isArray(data)) {
                // Data is already an array (deserialized by deserialize-json-api)
                achievementsData = data.map((item: any) => {
                    // Handle both flattened and nested attribute structures
                    let achievement: Achievement;
                    
                    if (item.attributes) {
                        // Nested attributes structure: { id, type, attributes: {...} }
                        achievement = {
                            id: typeof item.id === 'string' ? parseInt(item.id, 10) : (item.id || parseInt(item.attributes.id || item.attributes.id, 10)),
                            title: item.attributes.title || '',
                            description: item.attributes.description || '',
                            value: item.attributes.value || 0,
                            hidden: item.attributes.hidden || false,
                            unlocked: item.attributes.unlocked,
                            progress: item.attributes.progress
                        };
                    } else {
                        // Flattened structure (deserializer already flattened)
                        achievement = {
                            id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id,
                            title: item.title || '',
                            description: item.description || '',
                            value: item.value || 0,
                            hidden: item.hidden || false,
                            unlocked: item.unlocked,
                            progress: item.progress
                        };
                    }
                    
                    console.log("Processed achievement:", achievement);
                    return achievement;
                });
            } else if (data && typeof data === 'object' && 'data' in data) {
                // JSON API format: { data: [...] }
                const dataArray = (data as any).data;
                if (Array.isArray(dataArray)) {
                    achievementsData = dataArray.map((item: any) => {
                        const attrs = item.attributes || item;
                        return {
                            id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id,
                            title: attrs.title || '',
                            description: attrs.description || '',
                            value: attrs.value || 0,
                            hidden: attrs.hidden || false,
                            unlocked: attrs.unlocked,
                            progress: attrs.progress
                        } as Achievement;
                    });
                }
            }
            
            // Debug: log the first achievement to see its structure
            if (achievementsData.length > 0) {
                console.log("Final achievements data (first):", achievementsData[0]);
                console.log("Has unlocked:", achievementsData[0].unlocked !== undefined);
                console.log("Has progress:", achievementsData[0].progress !== undefined);
                console.log("Unlocked value:", achievementsData[0].unlocked);
                console.log("Progress value:", achievementsData[0].progress);
            }
            
            setAchievements(achievementsData);
            setWaiting(false);
        }).catch((error) => {
            console.error("Failed to load achievements:", error);
            setAchievements([]);
            setWaiting(false);
        });
    }, []);

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    const getValueColor = (value: number): string => {
        if (value >= 30) return 'red';
        if (value >= 15) return 'orange';
        if (value >= 10) return 'gold';
        if (value >= 5) return 'blue';
        return 'default';
    };

    const renderAchievementCard = (achievement: Achievement) => {
        const isHidden = achievement.hidden;
        const isUnlocked = achievement.unlocked === true;
        const displayTitle = isHidden ? "???" : achievement.title;
        const displayDescription = isHidden ? "???" : achievement.description;
        const progress = achievement.progress;
        const showProgress = progress !== undefined && progress !== null;

        return (
            <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
                <Card
                    hoverable
                    style={{
                        height: '100%',
                        marginBottom: '16px',
                        border: isUnlocked 
                            ? '2px solid #52c41a' 
                            : isHidden 
                                ? '2px dashed #d9d9d9' 
                                : '1px solid #d9d9d9',
                        backgroundColor: isUnlocked 
                            ? '#f6ffed' 
                            : isHidden 
                                ? '#fafafa' 
                                : '#ffffff'
                    }}
                    bodyStyle={{ padding: '16px' }}
                >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Space>
                                <span style={{ fontSize: '1.5rem' }}>{VectorGraphics.ACHIEVEMENTS}</span>
                                <Title level={5} style={{ margin: 0, fontSize: '1rem' }}>
                                    {displayTitle}
                                </Title>
                            </Space>
                            <Tag color={getValueColor(achievement.value)} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                {achievement.value} {t("achievement.points") || "pts"}
                            </Tag>
                        </div>
                        {displayDescription && (
                            <Text type="secondary" style={{ fontSize: '0.85rem', display: 'block' }}>
                                {displayDescription}
                            </Text>
                        )}
                        {isUnlocked && (
                            <Tag color="success" style={{ fontSize: '0.75rem' }}>
                                {t("achievement.unlocked") || "Unlocked"}
                            </Tag>
                        )}
                        {showProgress && !isUnlocked && (
                            <div style={{ marginTop: '8px' }}>
                                <Progress 
                                    percent={Math.round(progress * 100)} 
                                    size="small"
                                    strokeColor={{
                                        '0%': '#108ee9',
                                        '100%': '#87d068',
                                    }}
                                />
                                <Text type="secondary" style={{ fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>
                                    {Math.round(progress * 100)}% {t("achievement.complete") || "complete"}
                                </Text>
                            </div>
                        )}
                    </Space>
                </Card>
            </Col>
        );
    };

    return (
        <div>
            {achievements.length > 0 ? (
                <Row gutter={[16, 16]}>
                    {achievements.map(renderAchievementCard)}
                </Row>
            ) : (
                <Card>
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>
                            {VectorGraphics.ACHIEVEMENTS}
                        </span>
                        <Text type="secondary">
                            {t("achievement.noAchievements") || "No achievements available"}
                        </Text>
                    </div>
                </Card>
            )}
        </div>
    );
}

