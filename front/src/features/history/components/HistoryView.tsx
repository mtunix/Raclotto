import React, {useEffect, useState} from "react";
import {createPan, getPan} from "../../../api/generated/endpoints/pans/pans";
import {createRating} from "../../../api/generated/endpoints/ratings/ratings";
import type {PanDto} from "../../../api/generated/model";
import {mutatePanLists} from "../../../lib/api/swrHooks";
import {Card, Row, Col, Rate, Spin, Button, Typography, Space, Tag, message, Avatar} from "antd";
import {useTranslation} from "react-i18next";
import {useAppStore} from "../../../AppSlice";
import {useAuthStore} from "../../../AuthSlice";
import {IngredientDisplay} from "../../../shared/IngredientDisplay/IngredientDisplay";
import {VectorGraphics} from "../../../lib/vectorGraphics";
import {useNavigate, useParams} from "react-router-dom";
import {getTextureBorderImage} from "../../../lib/borderTextures";
import { HistoryCloneConfirmModal } from "./HistoryCloneConfirmModal";
import { PanResultModal } from "../../generation/PanResultModal";
import { applyRollOutcome, LevelUp } from "../../generation/applyRollOutcome";
import { usePanPages } from "../usePanPages";
import {SortingControls} from "./SortingControls";
import {FilterControls} from "./FilterControls";
import {getUniqueUsers, getUniqueRatings, getIngredientCountRanges, filterPans, sortPans} from "./historyUtils";
import useBreakpoint from "antd/es/grid/hooks/useBreakpoint";

const {Title, Text} = Typography;

export function HistoryView() {
    let { t } = useTranslation();
    const navigate = useNavigate();
    const params = useParams<{sessionId: string}>();
    const sessionId = params.sessionId || "";
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const currentUser = useAuthStore((state) => state.user);
    let [cloningPanId, setCloningPanId] = useState<number | null>(null);
    const [cloneConfirmVisible, setCloneConfirmVisible] = useState(false);
    const [selectedPan, setSelectedPan] = useState<PanDto | null>(null);
    const [clonedPan, setClonedPan] = useState<PanDto | null>(null);
    const [cloneLevelUp, setCloneLevelUp] = useState<LevelUp>({ leveledUp: false });
    const [sortField, setSortField] = useState<'time' | 'rating' | 'counts'>('time');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
    const [selectedIngredientCounts, setSelectedIngredientCounts] = useState<string[]>([]);
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const screens = useBreakpoint();
    const isMobile = screens.xs || screens.sm;
    const { pans, hasMore, loadMore, replacePan, isLoading: waiting } = usePanPages({ session_key: sessionKey });

    // Reset the filters when the session changes
    useEffect(() => {
        setSelectedUsers([]);
        setSelectedRatings([]);
        setSelectedIngredientCounts([]);
    }, [sessionKey]);

    function onRating(id: number, rating: number) {
        if (!sessionKey) return;
        createRating({ pan_id: id, rating })
            .then(() => {
                mutatePanLists();
                return getPan(id);
            })
            .then(replacePan)
            .catch((error) => {
                console.error("Failed to submit rating:", error);
            });
    }

    function onClonePan(pan: PanDto) {
        if (!sessionKey) return;
        setCloningPanId(pan.id);
        createPan({ name: pan.name, ingredients: pan.ingredients.map((ing) => ing.id) }, { session_key: sessionKey })
            .then((outcome) => {
                message.success(t("history.panCloned") || "Pan cloned successfully");
                setCloneLevelUp(applyRollOutcome(outcome, sessionKey));
                setClonedPan(outcome.pan);
            })
            .catch((error) => {
                console.error("Failed to clone pan:", error);
                message.error(t("history.panCloneFailed") || "Failed to clone pan");
            })
            .finally(() => {
                setCloningPanId(null);
            });
    }

    function handleCloneClick(pan: PanDto) {
        setSelectedPan(pan);
        setCloneConfirmVisible(true);
    }

    function handleCloneConfirm() {
        if (!selectedPan) {
            setCloneConfirmVisible(false);
            return;
        }

        setCloneConfirmVisible(false);
        onClonePan(selectedPan);
    }

    function handleCloneCancel() {
        setCloneConfirmVisible(false);
    }

    function handleCloneResultClose() {
        setClonedPan(null);
        setCloneLevelUp({ leveledUp: false });
        setSelectedPan(null);
    }

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    // Function to determine if text should be black or white based on background color
    const getContrastColor = (hexColor: string) => {
        // Remove # if present
        const color = hexColor.replace('#', '');
        
        // Convert to RGB
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        // Calculate luminance (perceived brightness)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black for light colors, white for dark colors
        return luminance > 0.5 ? '#000000' : '#ffffff';
    };

    function handleProfileClick(userId?: number) {
        if (userId && sessionId) {
            const profileRoute = `/${sessionId}/profile/${userId}`;
            navigate(profileRoute);
        }
    }

    // Get unique values for filters
    const uniqueUsers = getUniqueUsers(pans);
    const uniqueRatings = getUniqueRatings(pans);
    const uniqueIngredientRanges = getIngredientCountRanges(pans);

    // Apply filters and sorting
    const filteredPans = filterPans(pans, {
        selectedUsers,
        selectedRatings,
        selectedIngredientCounts
    });
    const finalPans = sortPans(filteredPans, sortField, sortDirection);

    if (waiting) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <Spin size="large" />
            </div>
        );
    }

    const renderPanCard = (pan: PanDto) => {
        const author = pan.author;
        const borderColor = author?.color ?? "#d9d9d9";
        // All borders are 5px
        const borderWidth = '5px';
        const borderStyle = author?.border_style ?? 'solid';
        const borderTexture = author?.border_texture ?? null;
        const textureBorderImage = getTextureBorderImage(borderTexture);
        const glowEffect = author?.glow_effect ?? false;

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
        if (glowEffect) {
            const glowColor = borderColor || "#1890ff";
            
            // Balanced glow effect
            const glowStyle = `0 0 10px ${glowColor}50, 0 0 20px ${glowColor}30, 0 0 30px ${glowColor}15`;
            
            borderStyleObj.boxShadow = glowStyle;
            borderStyleObj.position = 'relative';
            borderStyleObj.zIndex = '10';
            
            if (wrapperStyle) {
                wrapperStyle.boxShadow = glowStyle;
                wrapperStyle.position = 'relative';
                wrapperStyle.zIndex = '10';
            }
        }
        
        // Check if current user has rated this pan
        let userRatingValue: number | undefined = undefined;
        
        if (currentUser) {
            userRatingValue = pan.ratings.find((r) => r.user_id === currentUser.id)?.rating;
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
                                    {author && (
                                        <Avatar
                                            src={author.profile_picture}
                                            size={32}
                                            style={{ 
                                                cursor: 'pointer',
                                                border: '2px solid #d9d9d9',
                                                flexShrink: 0
                                            }}
                                            onClick={() => handleProfileClick(author.id)}
                                        >
                                            {!author.profile_picture && (
                                                <span style={{ fontSize: '14px' }}>
                                                    {author.name.charAt(0).toUpperCase() || 'U'}
                                                </span>
                                            )}
                                        </Avatar>
                                    )}
                                    <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                                        {t("history.consumedBy")} <strong>{author?.name ?? "Unknown"}</strong>
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
                            style={{ 
                                marginTop: '4px',
                                backgroundColor: borderColor,
                                borderColor: borderColor,
                                color: getContrastColor(borderColor)
                            }}
                            onClick={() => handleCloneClick(pan)}
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
    };

    return (
        <div>
            <HistoryCloneConfirmModal
                visible={cloneConfirmVisible}
                onConfirm={handleCloneConfirm}
                onCancel={handleCloneCancel}
                title={t("history.cloneConfirmTitle") || t("history.iWantThisToo")}
                message={
                    t("history.cloneConfirmMessage") ||
                    t("history.cloneConfirmFallback", {
                        defaultValue: "Do you really want to clone this pan for yourself?",
                    })
                }
            />

            <PanResultModal
                open={clonedPan !== null}
                pan={clonedPan}
                isBanditResult={false}
                rollCheese={clonedPan?.rolled_cheese ?? false}
                onClose={handleCloneResultClose}
                onRating={(rating) => {
                    if (!clonedPan) return;
                    onRating(clonedPan.id, rating);
                }}
                hasLeveledUp={cloneLevelUp.leveledUp}
                newLevelId={cloneLevelUp.newLevelId}
            />
            {pans.length > 0 && (
                <>
                    {isMobile ? (
                        // Mobile view - collapsible
                        <Card style={{ marginBottom: '16px' }}>
                            <Button 
                                type="default" 
                                onClick={() => setFiltersExpanded(!filtersExpanded)}
                                style={{ width: '100%', textAlign: 'left' }}
                            >
                                {t("history.sortAndFilters") || "Sort & Filters"}
                                <span style={{ float: 'right' }}>
                                    {filtersExpanded ? '▲' : '▼'}
                                </span>
                                {(selectedUsers.length > 0 || selectedRatings.length > 0 || selectedIngredientCounts.length > 0) && (
                                    <Tag style={{ marginLeft: '8px' }}>
                                        {selectedUsers.length + selectedRatings.length + selectedIngredientCounts.length}
                                    </Tag>
                                )}
                            </Button>
                            {filtersExpanded && (
                                <div style={{ marginTop: '16px' }}>
                                    <SortingControls
                                        sortField={sortField}
                                        sortDirection={sortDirection}
                                        onSortFieldChange={setSortField}
                                        onSortDirectionChange={setSortDirection}
                                    />
                                    <div style={{ marginTop: '16px' }}>
                                        <FilterControls
                                            selectedUsers={selectedUsers}
                                            selectedRatings={selectedRatings}
                                            selectedIngredientCounts={selectedIngredientCounts}
                                            uniqueUsers={uniqueUsers}
                                            uniqueRatings={uniqueRatings}
                                            uniqueIngredientRanges={uniqueIngredientRanges}
                                            onUsersChange={setSelectedUsers}
                                            onRatingsChange={setSelectedRatings}
                                            onIngredientCountsChange={setSelectedIngredientCounts}
                                            onClearFilters={() => {
                                                setSelectedUsers([]);
                                                setSelectedRatings([]);
                                                setSelectedIngredientCounts([]);
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </Card>
                    ) : (
                        // Desktop view - always visible
                        <>
                            <Card style={{ marginBottom: '16px' }}>
                                <SortingControls
                                    sortField={sortField}
                                    sortDirection={sortDirection}
                                    onSortFieldChange={setSortField}
                                    onSortDirectionChange={setSortDirection}
                                />
                            </Card>

                            <Card style={{ marginBottom: '16px' }}>
                                <FilterControls
                                    selectedUsers={selectedUsers}
                                    selectedRatings={selectedRatings}
                                    selectedIngredientCounts={selectedIngredientCounts}
                                    uniqueUsers={uniqueUsers}
                                    uniqueRatings={uniqueRatings}
                                    uniqueIngredientRanges={uniqueIngredientRanges}
                                    onUsersChange={setSelectedUsers}
                                    onRatingsChange={setSelectedRatings}
                                    onIngredientCountsChange={setSelectedIngredientCounts}
                                    onClearFilters={() => {
                                        setSelectedUsers([]);
                                        setSelectedRatings([]);
                                        setSelectedIngredientCounts([]);
                                    }}
                                />
                            </Card>
                        </>
                    )}
                </>
            )}

                    {pans.length > 0 ? (
                <>
                    <Row gutter={[16, 16]}>
                        {finalPans.map(renderPanCard)}
                    </Row>
                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '24px' }}>
                            <Button 
                                type="primary" 
                                loading={waiting}
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

