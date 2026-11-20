import { useState } from "react";
import {createPan, useGetPanFilterOptions} from "../../../api/generated/endpoints/pans/pans";
import type {PanDto} from "../../../api/generated/model";
import {Card, Row, Col, Rate, Spin, Button, Typography, Space, Tag, message, Avatar, Grid} from "antd";
import {useTranslation} from "react-i18next";
import {useAppStore} from "../../../AppSlice";
import {useAuthStore} from "../../../AuthSlice";
import {VectorGraphics} from "../../../lib/vectorGraphics";
import {useNavigate, useParams} from "react-router";
import { PanCard, PanCardIngredients } from "../../../shared/PanCard/PanCard";
import "./HistoryView.css";
import { HistoryCloneConfirmModal } from "./HistoryCloneConfirmModal";
import { PanResultModal } from "../../generation/PanResultModal";
import { LevelUpPictureModal } from "../../generation/LevelUpPictureModal";
import { useRollSession } from "../../generation/rollSession";
import { usePanPages } from "../usePanPages";
import { useHistoryFilters } from "../useHistoryFilters";
import { ratePan } from "../../rating/ratePan";
import {SortingControls} from "./SortingControls";
import {FilterControls} from "./FilterControls";
import {displayName} from "../../../shared/displayName";
import {onErrorRetry} from "../../../lib/api/swrHooks";
import {formatDateTime, formatRating, useLanguage} from "../../../lib/language";

const {Title, Text} = Typography;

/** Black or white, whichever reads better on `hexColor`. */
function contrastColor(hexColor: string): string {
    const color = hexColor.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(color.slice(i, i + 2), 16));
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

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
    const { filters, filterCount, setSort, setDirection, setUsers, setRatings, setIngredientCounts, clearFilters } = useHistoryFilters();
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const screens = Grid.useBreakpoint();
    // antd's breakpoints are minimum widths: anything narrower than md (768px) is a phone.
    const isMobile = !screens.md;
    const { pans, hasMore, loadMore, replacePan, isLoading: waiting } = usePanPages({
        session_key: sessionKey,
        user_id: filters.users,
        rating: filters.ratings,
        ingredient_count: filters.ingredientCounts,
        sort: filters.sort,
        direction: filters.direction,
    });
    const { data: filterOptions } = useGetPanFilterOptions(
        { session_key: sessionKey },
        { swr: { enabled: Boolean(sessionKey), onErrorRetry, revalidateOnFocus: false } },
    );
    // A filter that matches nothing leaves its controls in place to clear it.
    const showControls = pans.length > 0 || filterCount > 0 || Boolean(filterOptions?.users.length);

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

    function handleProfileClick(userId?: number) {
        if (userId && sessionId) {
            const profileRoute = `/${sessionId}/profile/${userId}`;
            void navigate(profileRoute);
        }
    }

    const sortingControls = (
        <SortingControls
            sortField={filters.sort}
            sortDirection={filters.direction}
            onSortFieldChange={setSort}
            onSortDirectionChange={setDirection}
        />
    );
    const filterControls = (
        <FilterControls
            selectedUsers={filters.users}
            selectedRatings={filters.ratings}
            selectedIngredientCounts={filters.ingredientCounts}
            uniqueUsers={filterOptions?.users ?? []}
            uniqueRatings={filterOptions?.ratings ?? []}
            uniqueIngredientRanges={filterOptions?.ingredient_counts ?? []}
            onUsersChange={setUsers}
            onRatingsChange={setRatings}
            onIngredientCountsChange={setIngredientCounts}
            onClearFilters={clearFilters}
        />
    );

    const renderPanCard = (pan: PanDto) => {
        const author = pan.author;
        const authorColor = author?.color || undefined;
        const userRating = currentUser ? pan.ratings.find((r) => r.user_id === currentUser.id)?.rating : undefined;

        return (
            <Col xs={24} sm={24} md={12} lg={8} key={pan.id}>
                <PanCard author={author}>
                    <Space orientation="vertical" size="small" className="full-width">
                        <div className="pan-card-header">
                            <Space orientation="vertical" size={0} className="pan-card-heading">
                                <Title level={4} className="pan-card-title">
                                    {displayName(pan.name, t)}
                                </Title>
                                <Space size="small" align="center">
                                    {author && (
                                        <Avatar
                                            src={author.profile_picture}
                                            size={32}
                                            className="history-author-avatar"
                                            onClick={() => handleProfileClick(author.id)}
                                        >
                                            {!author.profile_picture && (
                                                <span className="history-author-initial">
                                                    {author.name.charAt(0).toUpperCase() || 'U'}
                                                </span>
                                            )}
                                        </Avatar>
                                    )}
                                    <Text type="secondary" className="history-author">
                                        {t("history.consumedBy")} <strong>{author?.name ?? t("profile.unknownUser")}</strong>
                                    </Text>
                                </Space>
                                <Text type="secondary" className="pan-card-meta">
                                    {t("history.consumedAt")} {formatDateTime(pan.timestamp, language)}
                                </Text>
                            </Space>
                            <div className="pan-card-side">
                                <Rate
                                    value={userRating ?? 0}
                                    onChange={(rating: number) => onRating(pan.id, rating)}
                                    allowHalf
                                    className="history-rate"
                                />
                                {pan.rating > 0 && (
                                    <div className="history-score">
                                        <Tag color="gold" className="pan-card-score">
                                            {formatRating(pan.rating, language)}
                                        </Tag>
                                    </div>
                                )}
                            </div>
                        </div>
                        <PanCardIngredients ingredients={pan.ingredients} />
                        <Button
                            type="primary"
                            block
                            size="small"
                            className="history-clone-button"
                            // The author's colour, as their border has it.
                            style={authorColor ? { backgroundColor: authorColor, borderColor: authorColor, color: contrastColor(authorColor) } : undefined}
                            onClick={() => handleCloneClick(pan)}
                            loading={cloningPanId === pan.id}
                            disabled={cloningPanId !== null}
                        >
                            {t("history.iWantThisToo")}
                        </Button>
                    </Space>
                </PanCard>
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
                        <Card className="mb-16">
                            <Button 
                                type="default" 
                                onClick={() => setFiltersExpanded(!filtersExpanded)}
                                className="history-filters-toggle"
                            >
                                {t("history.sortAndFilters")}
                                <span className="history-filters-arrow">
                                    {filtersExpanded ? '▲' : '▼'}
                                </span>
                                {filterCount > 0 && (
                                    <Tag className="ml-8">
                                        {filterCount}
                                    </Tag>
                                )}
                            </Button>
                            {filtersExpanded && (
                                <div className="mt-16">
                                    {sortingControls}
                                    <div className="mt-16">
                                        {filterControls}
                                    </div>
                                </div>
                            )}
                        </Card>
                    ) : (
                        // Desktop view - always visible
                        <>
                            <Card className="mb-16">
                                {sortingControls}
                            </Card>

                            <Card className="mb-16">
                                {filterControls}
                            </Card>
                        </>
                    )}
                </>
            )}

            {waiting && pans.length === 0 ? (
                <div className="loading-block">
                    <Spin size="large" />
                </div>
            ) : pans.length > 0 ? (
                <>
                    <Row gutter={[16, 16]}>
                        {pans.map(renderPanCard)}
                    </Row>
                    {hasMore && (
                        <div className="history-more">
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
                    <div className="empty-state">
                        <span className="empty-state-icon">
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

