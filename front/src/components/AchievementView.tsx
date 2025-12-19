import React from "react";
import {Spin, Card, Row, Col, Tag, Typography, Space, Progress} from "antd";
import {useAchievements} from "../lib/api/swrHooks";
import {Achievement} from "../model/achievement";
import {VectorGraphics} from "../lib/vectorGraphics";
import {useTranslation} from "react-i18next";

const {Title, Text} = Typography;

type AchievementViewProps = {};

export function AchievementView(props: AchievementViewProps) {
    const {t} = useTranslation();
    const { data: achievementsData = [], isLoading: waiting } = useAchievements();
    
    // Transform data to Achievement format (fetcher already handles most of this)
    const achievements = achievementsData.map((item: any) => ({
        id: item.id,
        title: item.title || item.name || '',
        description: item.description || '',
        value: item.value !== undefined ? item.value : (item.points !== undefined ? item.points : 0),
        hidden: item.hidden || false,
        unlocked: item.unlocked,
        progress: item.progress
    } as Achievement));

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

