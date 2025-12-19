import React, {useState, useEffect, useCallback} from "react";
import {Api} from "../lib/api";
import {usePansPaginated, mutatePansPaginated} from "../lib/api/swrHooks";
import {Card, Row, Col, Rate, Spin, Button, Typography, Space, Tag, message, Avatar} from "antd";
import {Pan} from "../model/pan";
import {useTranslation} from "react-i18next";
import {useAppStore} from "../AppSlice";
import {useAuthStore} from "../AuthSlice";
import {IngredientDisplay} from "./common/IngredientDisplay";
import {VectorGraphics} from "../lib/vectorGraphics";
import {useNavigate, useParams} from "react-router-dom";
import {getTextureBorderImage} from "../lib/borderTextures";

const {Title, Text} = Typography;

export function HistoryView() {
    let { t } = useTranslation();
    const navigate = useNavigate();
    const params = useParams<{sessionId: string}>();
    const sessionId = params.sessionId || "";
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const currentUser = useAuthStore((state) => state.user);
    let [offset, setOffset] = useState(0);
    let [allPans, setAllPans] = useState<Pan[]>([]);
    let [cloningPanId, setCloningPanId] = useState<number | null>(null);
    const limit = 12;

    // Use SWR hook for the current page
    const { data: currentPageData, isLoading: waiting } = usePansPaginated(sessionKey, limit, offset);
    
    // Reset when session changes
    useEffect(() => {
        if (sessionKey) {
            setOffset(0);
            setAllPans([]);
        }
    }, [sessionKey]);
    
    // Update accumulated pans when new page data arrives
    useEffect(() => {
        if (currentPageData) {
            if (offset === 0) {
                // Reset - replace all pans
                // Always set when at offset 0, especially important when remounting with cached data
                setAllPans(currentPageData.data);
            } else {
                // Append new page
                setAllPans(prev => {
                    // Avoid duplicates by checking if we already have these pans
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
    // Use currentPageData directly when at offset 0 and allPans is empty (handles remount case)
    const pans = (offset === 0 && allPans.length === 0 && currentPageData?.data) 
        ? currentPageData.data 
        : allPans;

    function onRating(id: number, rating: number) {
        if (!sessionKey) return;
        Api.rate(sessionKey, id, rating).then(() => {
            // Invalidate cache to refresh ratings
            mutatePansPaginated(sessionKey);
        }).catch((error) => {
            console.error("Failed to submit rating:", error);
        });
    }
    
    function onClonePan(pan: Pan) {
        if (!sessionKey) return;
        setCloningPanId(pan.id);
        Api.clonePan(sessionKey, pan).then(() => {
            message.success(t("history.panCloned") || "Pan cloned successfully");
            // Invalidate cache to refresh pans
            mutatePansPaginated(sessionKey);
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

    function handleProfileClick(userId?: number) {
        if (userId && sessionId) {
            const profileRoute = `/${sessionId}/profile/${userId}`;
            navigate(profileRoute);
        }
    }

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    const renderPanCard = (pan: Pan) => {
        const borderColor = pan.user_color || "#d9d9d9";
        // All borders are 5px
        const borderWidth = '5px';
        const borderStyle = pan.user_border_style || 'solid';
        const borderTexture = pan.user_border_texture;
        const textureBorderImage = getTextureBorderImage(borderTexture);
        const glowEffect = pan.user_glow_effect || false;
        
        // Debug: log border preferences and glow effect
        console.log('Pan border data:', {
            panId: pan.id,
            panUser: pan.user,
            user_border_style: pan.user_border_style,
            user_border_texture: pan.user_border_texture,
            user_color: pan.user_color,
            user_glow_effect: pan.user_glow_effect,
            glowEffect: glowEffect,
            borderStyle,
            borderTexture,
            textureBorderImage
        });
        
        // Build border style object
        // Note: We need to explicitly override the global .ant-card { border: none; } rule
        const cssBorderStyle = borderStyle as React.CSSProperties['borderStyle'];
        const borderStyleObj: React.CSSProperties = {
            height: '100%',
            marginBottom: '16px',
        };
        
        // Wrapper style for textured borders (needed for border-radius with border-image)
        let wrapperStyle: React.CSSProperties | undefined = undefined;
        
        // Apply texture if available (border-image takes precedence over individual border properties)
        if (textureBorderImage) {
            // Workaround for border-image + border-radius: use wrapper with padding
            // Extract the image URL from the border-image value
            const imageUrl = textureBorderImage.match(/url\(([^)]+)\)/)?.[1];
            
            // Wrapper: has padding (creates border space), background with texture, rounded corners
            wrapperStyle = {
                borderRadius: '18px',
                padding: borderWidth,
                background: imageUrl ? `url(${imageUrl})` : borderColor,
                backgroundSize: 'auto',
                backgroundRepeat: 'repeat',
                marginBottom: '16px',
                position: 'relative' as const,
                overflow: 'hidden' as const, // Ensure rounded corners clip the background
            };
            
            // Card style for textured border - rounded corners, covers center area
            // The card's background will cover the center, leaving only the padding area (border) visible
            borderStyleObj.border = 'none';
            borderStyleObj.borderRadius = '18px';
            borderStyleObj.height = '100%';
            borderStyleObj.marginBottom = '0';
            borderStyleObj.backgroundColor = '#ffffff'; // Cover the center with white
            borderStyleObj.position = 'relative' as const;
        } else {
            // No texture - use individual border properties for custom styling
            // IMPORTANT: Set all border properties explicitly to override global CSS
            borderStyleObj.borderTop = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
            borderStyleObj.borderRight = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
            borderStyleObj.borderBottom = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
            borderStyleObj.borderLeft = `${borderWidth} ${cssBorderStyle} ${borderColor}`;
            borderStyleObj.borderRadius = '18px'; // Also round non-textured borders
        }
        
        // Apply glow effect if enabled
        let glowClassName = '';
        let glowWrapperClassName = '';
        if (glowEffect) {
            const glowColor = borderColor || "#d9d9d9";
            // Convert hex color to RGB for rgba
            const hexToRgb = (hex: string) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : { r: 217, g: 217, b: 217 }; // Default gray
            };
            const rgb = hexToRgb(glowColor);
            // Very visible glow - using rgba for better control
            const glowColorRgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
            const glowColorRgbaLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
            const glowColorRgbaVeryLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
            
            // Strong, very visible glow shadow with multiple layers
            const glowShadow = `0 0 25px 6px ${glowColorRgba}, 0 0 40px 10px ${glowColorRgbaLight}, 0 0 60px 15px ${glowColorRgbaVeryLight}`;
            borderStyleObj.boxShadow = glowShadow;
            if (wrapperStyle) {
                wrapperStyle.boxShadow = glowShadow;
            }
            
            glowClassName = 'pan-card-glow-card';
            glowWrapperClassName = 'pan-card-glow-wrapper';
        }
        
        console.log('Final borderStyleObj:', {
            panId: pan.id,
            borderStyle,
            borderTexture,
            hasTexture: !!textureBorderImage,
            borderTop: borderStyleObj.borderTop,
            borderLeft: borderStyleObj.borderLeft,
            borderImage: borderStyleObj.borderImage
        });
        
        // Check if current user has rated this pan
        let userRatingValue: number | undefined = undefined;
        
        if (currentUser && currentUser.id && pan.ratings && Array.isArray(pan.ratings) && pan.ratings.length > 0) {
            const currentUserRating = pan.ratings.find((r) => {
                if (!r) return false;
                // Handle both string and number comparisons
                const ratingUserId = typeof r.user_id === 'string' ? parseInt(r.user_id, 10) : r.user_id;
                const userId = typeof currentUser.id === 'string' ? parseInt(currentUser.id, 10) : currentUser.id;
                return ratingUserId === userId;
            });
            if (currentUserRating && currentUserRating.rating !== undefined && currentUserRating.rating !== null) {
                const ratingNum = Number(currentUserRating.rating);
                // Ensure it's a valid number and within valid range (0-5, or 0.5-5 if allowHalf)
                if (!isNaN(ratingNum) && ratingNum >= 0 && ratingNum <= 5) {
                    userRatingValue = ratingNum;
                }
            }
        }
        
        const cardContent = (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {/* Header with name and rating */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Space direction="vertical" size={0} style={{ flex: 1 }}>
                                <Title level={4} style={{ margin: 0, fontSize: '1rem', marginBottom: '4px' }}>
                                    {pan.name}
                                </Title>
                                <Space size="small" align="center">
                                    {pan.user_id && (
                                        <Avatar
                                            src={pan.user_profile_picture}
                                            size={32}
                                            style={{ 
                                                cursor: 'pointer',
                                                border: '2px solid #d9d9d9',
                                                flexShrink: 0
                                            }}
                                            onClick={() => handleProfileClick(pan.user_id)}
                                        >
                                            {!pan.user_profile_picture && (
                                                <span style={{ fontSize: '14px' }}>
                                                    {pan.user?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            )}
                                        </Avatar>
                                    )}
                                    <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                                        {t("history.consumedBy")} <strong>{pan.user}</strong>
                                    </Text>
                                </Space>
                                <Text type="secondary" style={{ fontSize: '0.7rem' }}>
                                    {t("history.consumedAt")} {formatDate(pan.timestamp)}
                                </Text>
                            </Space>
                            <div style={{ textAlign: 'right', marginLeft: '8px' }}>
                                <Rate
                                    value={userRatingValue ?? 0}
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
        );

        return (
            <Col xs={24} sm={24} md={12} lg={8} key={pan.id}>
                {textureBorderImage ? (
                    // Wrapper div for textured borders (allows border-radius with border-image)
                    <div style={wrapperStyle} className={glowWrapperClassName}>
                        <Card
                            style={borderStyleObj}
                            className={glowClassName}
                            bodyStyle={{ padding: '12px' }}
                        >
                            {cardContent}
                        </Card>
                    </div>
                ) : (
                    <Card
                        style={borderStyleObj}
                        className={glowClassName}
                        bodyStyle={{ padding: '12px' }}
                    >
                        {cardContent}
                    </Card>
                )}
            </Col>
        );
    };

    return (
        <div>
            {pans.length > 0 ? (
                <>
                    <Row gutter={[16, 16]}>
                        {pans.map(renderPanCard)}
                    </Row>
                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '24px' }}>
                            <Button 
                                type="primary" 
                                loading={waiting && offset > 0}
                                onClick={loadMore}
                                size="large"
                            >
                                {t("history.loadMore") || "Load More"}
                            </Button>
                        </div>
                    )}
                </>
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

