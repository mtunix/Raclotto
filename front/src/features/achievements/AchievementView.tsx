import {Spin, Card, Row, Col, Tag, Typography, Space, Progress} from "antd";
import {useListAchievements} from "../../api/generated/endpoints/achievements/achievements";
import type {AchievementStatusDto} from "../../api/generated/model";
import {onErrorRetry} from "../../lib/api/swrHooks";
import { formatNumber, useLanguage } from "../../lib/language";
import { VectorGraphics } from "../../lib/vectorGraphics";
import { achievementDescription, achievementTitle } from "../../shared/achievementText";
import { achievementValueColor } from "../../shared/achievementValueColor";
import {useTranslation} from "react-i18next";
import { PROGRESS_GRADIENT } from "../../shared/progressGradient";
import "./AchievementView.css";

const {Title, Text} = Typography;

export function AchievementView() {
    const {t} = useTranslation();
    const language = useLanguage();
    const { data: achievements = [], isLoading: waiting } = useListAchievements({
        swr: { onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true },
    });

    if (waiting) {
        return (
            <div className="loading-block">
                <Spin size="large" />
            </div>
        );
    }

    const renderAchievementCard = (achievement: AchievementStatusDto) => {
        const isHidden = achievement.hidden;
        const isUnlocked = achievement.unlocked;
        const displayTitle = isHidden ? "???" : achievementTitle(achievement, t);
        const displayDescription = isHidden ? "???" : achievementDescription(achievement, t);
        const progress = achievement.progress;
        const showProgress = progress !== null;

        return (
            <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
                <Card
                    hoverable
                    className={`achievement-tile ${isUnlocked ? "achievement-tile-unlocked" : isHidden ? "achievement-tile-hidden" : ""}`}
                    classNames={{ body: "achievement-tile-body" }}
                >
                    <Space orientation="vertical" size="small" className="full-width">
                        <div className="achievement-tile-header">
                            <Space>
                                <span className="achievement-tile-icon">{VectorGraphics.ACHIEVEMENTS}</span>
                                <Title level={5} className="achievement-tile-title">
                                    {displayTitle}
                                </Title>
                            </Space>
                            <Tag color={achievementValueColor(achievement.value)} className="achievement-tile-points">
                                {formatNumber(achievement.value, language)} {t("achievement.points")}
                            </Tag>
                        </div>
                        {displayDescription && (
                            <Text type="secondary" className="achievement-tile-description">
                                {displayDescription}
                            </Text>
                        )}
                        {isUnlocked && (
                            <Tag color="success" className="achievement-tile-unlocked-tag">
                                {t("achievement.unlocked")}
                            </Tag>
                        )}
                        {showProgress && !isUnlocked && (
                            <div className="mt-8">
                                <Progress 
                                    percent={Math.round(progress * 100)}
                                    format={(percent = 0) => formatNumber(percent / 100, language, { style: "percent" })}
                                    size="small"
                                    strokeColor={PROGRESS_GRADIENT}
                                />
                                <Text type="secondary" className="achievement-tile-progress">
                                    {formatNumber(progress, language, { style: "percent", maximumFractionDigits: 0 })} {t("achievement.complete")}
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
                    <div className="empty-state">
                        <span className="empty-state-icon">
                            {VectorGraphics.ACHIEVEMENTS}
                        </span>
                        <Text type="secondary">
                            {t("achievement.noAchievements")}
                        </Text>
                    </div>
                </Card>
            )}
        </div>
    );
}

