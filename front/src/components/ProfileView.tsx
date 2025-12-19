import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Row, Col, Avatar, Spin, Statistic, Typography, List, Tag, Empty, Rate, Progress, Button, Space } from "antd";
import { useUserProfile, useUserStats, usePansByUser } from "../lib/api/swrHooks";
import { useAuthStore } from "../AuthSlice";
import { useTranslation } from "react-i18next";
import { Achievement } from "../model/achievement";
import { Pan } from "../model/pan";
import { IngredientDisplay } from "./common/IngredientDisplay";
import { VectorGraphics } from "../lib/vectorGraphics";
import { getTextureBorderImage } from "../lib/borderTextures";

const { Title, Text } = Typography;

export function ProfileView() {
    const { t } = useTranslation();
    const { userId } = useParams<{ userId?: string }>();
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);
    
    // Use current user ID if no userId provided
    const targetUserId = userId ? parseInt(userId, 10) : (currentUser?.id || 0);
    const isOwnProfile = !userId || targetUserId === currentUser?.id;
    
    const { data: userProfile, isLoading: loadingProfile, error: profileError } = useUserProfile(targetUserId);
    const { data: userStats, isLoading: loadingStats } = useUserStats(targetUserId);
    
    // Get user's pans (all sessions)
    const [offset, setOffset] = useState(0);
    const limit = 12;
    const { data: currentPageData, isLoading: loadingPans } = usePansByUser(targetUserId, limit, offset);
    const [allPans, setAllPans] = useState<Pan[]>([]);
    
    // Reset when user changes
    useEffect(() => {
        if (targetUserId) {
            setOffset(0);
            setAllPans([]);
        }
    }, [targetUserId]);
    
    // Update accumulated pans when new page data arrives
    useEffect(() => {
        if (currentPageData) {
            if (offset === 0) {
                setAllPans(currentPageData.data);
            } else {
                setAllPans(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPans = currentPageData.data.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newPans];
                });
            }
        }
    }, [currentPageData, offset]);
    
    const loadMore = useCallback(() => {
        if (currentPageData?.hasMore) {
            setOffset(prev => prev + limit);
        }
    }, [currentPageData, limit]);
    
    const hasMore = currentPageData?.hasMore || false;
    const pans = (offset === 0 && allPans.length === 0 && currentPageData?.data) 
        ? currentPageData.data 
        : allPans;
    
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };
    
    const getValueColor = (value: number): string => {
        if (value >= 30) return 'red';
        if (value >= 15) return 'orange';
        if (value >= 10) return 'gold';
        if (value >= 5) return 'blue';
        return 'default';
    };
    
    if (loadingProfile || loadingStats) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Spin size="large" />
            </div>
        );
    }
    
    if (profileError || !userProfile) {
        return (
            <Card>
                <Empty
                    description={t("profile.userNotFound") || "User not found"}
                />
            </Card>
        );
    }
    
    const profileData = userProfile.attributes || userProfile;
    const stats = userStats || {};
    // Achievements might be in attributes or directly in profileData
    const achievements = profileData.achievements || (userProfile.achievements ? userProfile.achievements : []);
    
    return (
        <div style={{ padding: '24px 0' }}>
            {/* Profile Header */}
            <Card style={{ marginBottom: '24px' }}>
                <Row gutter={[24, 24]} align="middle">
                    <Col>
                        <Avatar
                            size={120}
                            src={profileData.profile_picture}
                            style={{ border: '3px solid #d9d9d9' }}
                        >
                            {!profileData.profile_picture && (
                                <span style={{ fontSize: '48px' }}>
                                    {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            )}
                        </Avatar>
                    </Col>
                    <Col flex={1}>
                        <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
                            {profileData.name || t("profile.unknownUser")}
                        </Title>
                        {profileData.email && (
                            <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                                {profileData.email}
                            </Text>
                        )}
                        {profileData.level && (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ marginBottom: '8px' }}>
                                    <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                                        <strong>
                                            {t("profile.level") || "Level"} {profileData.level.id}: {String(t(profileData.level.name, { defaultValue: profileData.level.name }))}
                                        </strong>
                                    </Tag>
                                    {profileData.experience_points !== undefined && (
                                        <Text type="secondary" style={{ marginLeft: '8px', fontSize: '14px' }}>
                                            {profileData.experience_points} XP
                                        </Text>
                                    )}
                                </div>
                                {profileData.next_level && profileData.experience_points !== undefined && (() => {
                                    const currentXP = profileData.experience_points;
                                    const currentLevelXP = profileData.level.required_experience;
                                    const nextLevelXP = profileData.next_level.required_experience;
                                    const xpInCurrentLevel = Math.max(0, currentXP - currentLevelXP);
                                    const xpNeededForNext = nextLevelXP - currentLevelXP;
                                    const progressPercent = xpNeededForNext > 0 
                                        ? Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100))
                                        : 100;
                                    
                                    return (
                                        <div style={{ marginTop: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {t("level.progressTo")} {String(t(profileData.next_level.name, { defaultValue: profileData.next_level.name }))}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {xpInCurrentLevel} / {xpNeededForNext} XP
                                                </Text>
                                            </div>
                                            <Progress
                                                percent={progressPercent}
                                                strokeColor={{
                                                    '0%': '#108ee9',
                                                    '100%': '#87d068',
                                                }}
                                                showInfo={false}
                                                size="small"
                                            />
                                        </div>
                                    );
                                })()}
                                {!profileData.next_level && profileData.experience_points !== undefined && (
                                    <div style={{ marginTop: '8px' }}>
                                        <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                                            {t("level.maximumLevelReached")}
                                        </Text>
                                    </div>
                                )}
                            </div>
                        )}
                    </Col>
                </Row>
            </Card>
            
            {/* Statistics Overview */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card>
                        <Statistic
                            title={t("profile.totalPans") || "Total Pans"}
                            value={stats.total_pans || 0}
                            prefix={VectorGraphics.HISTORY}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card>
                        <Statistic
                            title={t("profile.totalRatings") || "Ratings Given"}
                            value={stats.total_ratings_given || 0}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card>
                        <Statistic
                            title={t("profile.averageRating") || "Avg Rating"}
                            value={stats.average_rating_received || 0}
                            precision={2}
                            suffix="/ 5"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Card>
                        <Statistic
                            title={t("profile.achievementPoints") || "Achievement Points"}
                            value={stats.total_achievement_points || 0}
                            prefix={VectorGraphics.ACHIEVEMENTS}
                        />
                    </Card>
                </Col>
                {profileData.experience_points !== undefined && (
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Card>
                            <Statistic
                                title={t("profile.experiencePoints") || "Experience Points"}
                                value={profileData.experience_points || 0}
                                suffix="XP"
                            />
                        </Card>
                    </Col>
                )}
            </Row>
            
            {/* Favorite and Best Rated Ingredients */}
            {(stats.favorite_ingredient || stats.best_rated_ingredient) && (
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                    {stats.favorite_ingredient && (
                        <Col xs={24} md={12}>
                            <Card title={t("profile.favoriteIngredient") || "Favorite Ingredient"}>
                                <IngredientDisplay
                                    ingredient={stats.favorite_ingredient}
                                    variant="badge"
                                    showTags={false}
                                    showIcon={true}
                                />
                            </Card>
                        </Col>
                    )}
                    {stats.best_rated_ingredient && (
                        <Col xs={24} md={12}>
                            <Card title={t("profile.bestRatedIngredient") || "Best Rated Ingredient"}>
                                <div>
                                    <IngredientDisplay
                                        ingredient={stats.best_rated_ingredient}
                                        variant="badge"
                                        showTags={false}
                                        showIcon={true}
                                    />
                                    {stats.best_rated_ingredient.avg_rating && (
                                        <div style={{ marginTop: '8px' }}>
                                            <Rate
                                                disabled
                                                allowHalf
                                                value={stats.best_rated_ingredient.avg_rating}
                                                style={{ fontSize: '14px' }}
                                            />
                                            <Text type="secondary" style={{ marginLeft: '8px' }}>
                                                {stats.best_rated_ingredient.avg_rating.toFixed(2)}
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </Col>
                    )}
                </Row>
            )}
            
            {/* Achievements */}
            <Card
                title={t("profile.achievements") || "Achievements"}
                style={{ marginBottom: '24px' }}
            >
                {achievements.length > 0 ? (
                    <Row gutter={[16, 16]}>
                        {achievements.map((achievement: Achievement) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
                                <Card
                                    size="small"
                                    style={{
                                        border: '2px solid #52c41a',
                                        backgroundColor: '#f6ffed'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
                                                {achievement.title || ''}
                                            </Title>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                {achievement.description || ''}
                                            </Text>
                                        </div>
                                        <Tag color={getValueColor(achievement.value || 0)}>
                                            {achievement.value || 0} {t("achievement.points") || "pts"}
                                        </Tag>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Empty
                        description={t("profile.noAchievements") || "No achievements unlocked yet"}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                )}
            </Card>
            
            {/* Pans History */}
            <Card title={t("profile.pansHistory") || "Pans History"}>
                {loadingPans && offset === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                        <Spin size="large" />
                    </div>
                ) : pans.length > 0 ? (
                    <>
                        <Row gutter={[16, 16]}>
                            {pans.map((pan: Pan) => {
                                const borderColor = pan.user_color || "#d9d9d9";
                                const borderWidth = '5px';
                                const borderStyle = pan.user_border_style || 'solid';
                                const borderTexture = pan.user_border_texture;
                                const textureBorderImage = getTextureBorderImage(borderTexture);
                                
                                const cssBorderStyle = borderStyle as React.CSSProperties['borderStyle'];
                                const borderStyleObj: React.CSSProperties = {
                                    height: '100%',
                                    marginBottom: '16px',
                                };
                                
                                let wrapperStyle: React.CSSProperties | undefined = undefined;
                                
                                if (textureBorderImage) {
                                    const imageUrl = textureBorderImage.match(/url\(([^)]+)\)/)?.[1];
                                    wrapperStyle = {
                                        borderRadius: '18px',
                                        padding: borderWidth,
                                        background: imageUrl ? `url(${imageUrl})` : borderColor,
                                        backgroundSize: 'auto',
                                        backgroundRepeat: 'repeat',
                                        marginBottom: '16px',
                                        position: 'relative' as const,
                                        overflow: 'hidden' as const,
                                    };
                                    borderStyleObj.border = 'none';
                                    borderStyleObj.borderRadius = '18px';
                                    borderStyleObj.height = '100%';
                                    borderStyleObj.marginBottom = '0';
                                    borderStyleObj.backgroundColor = '#ffffff';
                                    borderStyleObj.position = 'relative' as const;
                                } else {
                                    borderStyleObj.borderTop = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
                                    borderStyleObj.borderRight = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
                                    borderStyleObj.borderBottom = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
                                    borderStyleObj.borderLeft = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
                                    borderStyleObj.borderRadius = '18px';
                                }
                                
                                const cardContent = (
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Space direction="vertical" size={0} style={{ flex: 1 }}>
                                                <Title level={4} style={{ margin: 0, fontSize: '1rem', marginBottom: '4px' }}>
                                                    {pan.name}
                                                </Title>
                                                <Text type="secondary" style={{ fontSize: '0.7rem' }}>
                                                    {formatDate(pan.timestamp)}
                                                </Text>
                                            </Space>
                                            {pan.rating > 0 && (
                                                <div style={{ textAlign: 'right', marginLeft: '8px' }}>
                                                    <Tag color="gold" style={{ fontSize: '0.7rem' }}>
                                                        {pan.rating.toFixed(1)}
                                                    </Tag>
                                                </div>
                                            )}
                                        </div>
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
                                    </Space>
                                );
                                
                                return (
                                    <Col xs={24} sm={24} md={12} lg={8} key={pan.id}>
                                        {textureBorderImage ? (
                                            <div style={wrapperStyle}>
                                                <Card
                                                    style={borderStyleObj}
                                                    bodyStyle={{ padding: '12px' }}
                                                >
                                                    {cardContent}
                                                </Card>
                                            </div>
                                        ) : (
                                            <Card
                                                style={borderStyleObj}
                                                bodyStyle={{ padding: '12px' }}
                                            >
                                                {cardContent}
                                            </Card>
                                        )}
                                    </Col>
                                );
                            })}
                        </Row>
                        {hasMore && (
                            <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '24px' }}>
                                <Button 
                                    type="primary" 
                                    loading={loadingPans && offset > 0}
                                    onClick={loadMore}
                                    size="large"
                                >
                                    {t("history.loadMore") || "Load More"}
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <Empty
                        description={t("history.noPans") || "No pans in history"}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                )}
            </Card>
        </div>
    );
}

