import { useState, type CSSProperties } from "react";
import {createPan, useGetPanFilterOptions} from "../../../api/generated/endpoints/pans/pans";
import type {ListPansDirection, ListPansIngredientCountItem, ListPansSort, PanDto} from "../../../api/generated/model";
import {Card, Row, Col, Rate, Spin, Button, Typography, Space, Tag, message, Avatar, Grid} from "antd";
import {useTranslation} from "react-i18next";
import {useAppStore} from "../../../AppSlice";
import {useAuthStore} from "../../../AuthSlice";
import {IngredientDisplay} from "../../../shared/IngredientDisplay/IngredientDisplay";
import {VectorGraphics} from "../../../lib/vectorGraphics";
import {useNavigate, useParams} from "react-router";
import {getTextureBorderImage} from "../../../lib/borderTextures";
import { HistoryCloneConfirmModal } from "./HistoryCloneConfirmModal";
import { PanResultModal } from "../../generation/PanResultModal";
import { LevelUpPictureModal } from "../../generation/LevelUpPictureModal";
import { useRollSession } from "../../generation/rollSession";
import { usePanPages } from "../usePanPages";
import { ratePan } from "../../rating/ratePan";
import {SortingControls} from "./SortingControls";
import {FilterControls} from "./FilterControls";
import {displayName} from "../../../shared/displayName";
import {onErrorRetry} from "../../../lib/api/swrHooks";
import {formatDateTime, useLanguage} from "../../../lib/language";

const {Title, Text} = Typography;

export function HistoryView() {
    const { t } = useTranslation();
    const language = useLanguage();
    const navigate = useNavigate();
    const params = useParams<{sessionId: string}>();
    const sessionId = params.sessionId || "";
    const session = useAppStore((state) => state.session);
    const sessionKey = session?.key || "";
    const currentUser = useAuthStore((state) => state.user);
    const [cloningPanId, setCloningPanId] = useState<number | null>(null);
    const [cloneConfirmVisible, setCloneConfirmVisible] = useState(false);
    const [selectedPan, setSelectedPan] = useState<PanDto | null>(null);
    const cloneRoll = useRollSession(sessionKey);
    const clone = cloneRoll.state.phase === "result" ? cloneRoll.state : null;
    const [sortField, setSortField] = useState<ListPansSort>('time');
    const [sortDirection, setSortDirection] = useState<ListPansDirection>('desc');
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
    const [selectedIngredientCounts, setSelectedIngredientCounts] = useState<ListPansIngredientCountItem[]>([]);
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.xs || screens.sm;
    const { pans, hasMore, loadMore, replacePan, isLoading: waiting } = usePanPages({
        session_key: sessionKey,
        user_id: selectedUsers,
        rating: selectedRatings,
        ingredient_count: selectedIngredientCounts,
        sort: sortField,
        direction: sortDirection,
    });
    const { data: filterOptions } = useGetPanFilterOptions(
        { session_key: sessionKey },
        { swr: { enabled: Boolean(sessionKey), onErrorRetry, revalidateOnFocus: false } },
    );
    const filterCount = selectedUsers.length + selectedRatings.length + selectedIngredientCounts.length;
    // A filter that matches nothing leaves its controls in place to clear it.
    const showControls = pans.length > 0 || filterCount > 0 || Boolean(filterOptions?.users.length);

    const [filteredSession, setFilteredSession] = useState(sessionKey);
    if (filteredSession !== sessionKey) {
        setFilteredSession(sessionKey);
        setSelectedUsers([]);
        setSelectedRatings([]);
        setSelectedIngredientCounts([]);
    }

    function onRating(id: number, rating: number) {
        if (!sessionKey) return;
        ratePan(id, rating)
            .then(replacePan)
            .catch((error) => {
                console.error("Failed to submit rating:", error);
            });
    }

    function onClonePan(pan: PanDto) {
        if (!sessionKey) return;
        setCloningPanId(pan.id);
        cloneRoll
            .roll(
                () => createPan({ name: pan.name, ingredients: pan.ingredients.map((ing) => ing.id) }, { session_key: sessionKey }),
                { animated: false },
            )
            .then(() => {
                message.success(t("history.panCloned"));
            })
            .catch((error) => {
                console.error("Failed to clone pan:", error);
                message.error(t("history.panCloneFailed"));
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
        cloneRoll.close();
        setSelectedPan(null);
    }

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
            void navigate(profileRoute);
        }
    }

    const uniqueUsers = filterOptions?.users ?? [];
    const uniqueRatings = filterOptions?.ratings ?? [];
    const uniqueIngredientRanges = filterOptions?.ingredient_counts ?? [];

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
        const cssBorderStyle = borderStyle as CSSProperties['borderStyle'];
        const borderStyleObj: CSSProperties = {
            height: '100%',
            marginBottom: '16px',
        };
        
        // Wrapper style for textured borders (needed for border-radius with border-image)
        let wrapperStyle: CSSProperties | undefined = undefined;
        
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
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        {/* Header with name and rating */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Space orientation="vertical" size={0} style={{ flex: 1 }}>
                                <Title level={4} style={{ margin: 0, fontSize: '1rem', marginBottom: '4px' }}>
                                    {displayName(pan.name, t)}
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
                                        {t("history.consumedBy")} <strong>{author?.name ?? t("profile.unknownUser")}</strong>
                                    </Text>
                                </Space>
                                <Text type="secondary" style={{ fontSize: '0.7rem' }}>
                                    {t("history.consumedAt")} {formatDateTime(pan.timestamp, language)}
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
                                    {t("ingredient.noIngredients")}
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
                            styles={{ body: { padding: '12px' } }}
                        >
                            {cardContent}
                        </Card>
                    </div>
                ) : (
                    <Card
                        style={borderStyleObj}
                        styles={{ body: { padding: '12px' } }}
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
                title={t("history.cloneConfirmTitle")}
                message={
                    t("history.cloneConfirmMessage")
                }
            />

            <PanResultModal
                open={clone !== null}
                pan={clone?.pan ?? null}
                rollCheese={clone?.pan.rolled_cheese ?? false}
                onClose={handleCloneResultClose}
                onRating={(rating) => {
                    cloneRoll.rate(rating)
                        .then(replacePan)
                        .catch((error) => {
                            console.error("Failed to submit rating:", error);
                        });
                }}
                hasLeveledUp={clone?.leveledUp}
            />
            <LevelUpPictureModal
                open={cloneRoll.state.phase === "picture"}
                levelId={cloneRoll.state.phase === "picture" ? cloneRoll.state.levelUpId : undefined}
                onClose={cloneRoll.pictureClosed}
            />
            {showControls && (
                <>
                    {isMobile ? (
                        // Mobile view - collapsible
                        <Card style={{ marginBottom: '16px' }}>
                            <Button 
                                type="default" 
                                onClick={() => setFiltersExpanded(!filtersExpanded)}
                                style={{ width: '100%', textAlign: 'left' }}
                            >
                                {t("history.sortAndFilters")}
                                <span style={{ float: 'right' }}>
                                    {filtersExpanded ? '▲' : '▼'}
                                </span>
                                {filterCount > 0 && (
                                    <Tag style={{ marginLeft: '8px' }}>
                                        {filterCount}
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

            {waiting && pans.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <Spin size="large" />
                </div>
            ) : pans.length > 0 ? (
                <>
                    <Row gutter={[16, 16]}>
                        {pans.map(renderPanCard)}
                    </Row>
                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '24px' }}>
                            <Button 
                                type="primary" 
                                loading={waiting}
                                onClick={loadMore}
                                size="large"
                            >
                                {t("history.loadMore")}
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
                            {t("history.noPans")}
                        </Text>
                    </div>
                </Card>
            )}
        </div>
    );
}

