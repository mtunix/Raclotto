import type { ReactNode } from "react";
import { Avatar, Button, Card, Col, Empty, Flex, Rate, Row, Statistic, Table, Tag, Typography } from "antd";
import { ArrowLeftOutlined, FireOutlined, FrownOutlined, StarOutlined, TrophyOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { useGetSessionRecap } from "../../api/generated/endpoints/sessions/sessions";
import type { PanDto, ParticipantRecapDto } from "../../api/generated/model";
import { onErrorRetry } from "../../lib/api/swrHooks";
import { formatDate, formatNumber, formatRating, numberFormatter, useLanguage } from "../../lib/language";
import { getProfilePictureUrl } from "../../lib/utils/profilePictureUrl";
import { displayName } from "../../shared/displayName";
import { IngredientDisplay } from "../../shared/IngredientDisplay/IngredientDisplay";
import { SpinnerContainer } from "../../shared/Spinner/Spinner";
import "./RecapView.css";

const { Title, Text } = Typography;

const MEDALS = ["🥇", "🥈", "🥉"];

function UserBadge({ user }: { user: ParticipantRecapDto["user"] }) {
    return (
        <Flex align="center" gap={8}>
            <Avatar src={getProfilePictureUrl(user.profile_picture)} style={{ backgroundColor: user.color }}>
                {user.name.charAt(0).toUpperCase()}
            </Avatar>
            <Text strong>{user.name}</Text>
        </Flex>
    );
}

interface HighlightProps {
    icon: ReactNode;
    title: string;
    pan: PanDto;
    extra?: ReactNode;
}

function PanHighlight({ icon, title, pan, extra }: HighlightProps) {
    const { t } = useTranslation();
    return (
        <Card className="recap-highlight" title={<Flex gap={8} align="center">{icon}{title}</Flex>} extra={extra}>
            <Title level={5} className="recap-pan-name">{displayName(pan.name, t)}</Title>
            {pan.author && <UserBadge user={pan.author} />}
            {pan.ratings.length > 0 && (
                <Flex align="center" gap={8} className="mt-12">
                    <Rate disabled allowHalf value={pan.rating} />
                    <Text type="secondary">{t("recap.ratingCount", { count: pan.ratings.length })}</Text>
                </Flex>
            )}
            <Flex wrap="wrap" gap={4} className="mt-12">
                {pan.ingredients.map((ingredient) => (
                    <IngredientDisplay key={ingredient.id} ingredient={ingredient} variant="badge" showTags={false} />
                ))}
            </Flex>
        </Card>
    );
}

/** How a session went: what was rolled, the best and the boldest pans, and everyone's evening. */
export function RecapView() {
    const { t } = useTranslation();
    const language = useLanguage();
    const navigate = useNavigate();
    const { sessionKey = "" } = useParams<{ sessionKey: string }>();
    const { data: recap, isLoading, error } = useGetSessionRecap(
        { session_key: sessionKey },
        { swr: { enabled: !!sessionKey, onErrorRetry, revalidateOnFocus: false } },
    );

    const back = (
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(recap?.session.active ? `/${recap.session.id}/dashboard` : "/")}>
            {recap?.session.active ? t("recap.backToSession") : t("session.backToSessions")}
        </Button>
    );

    if (isLoading) return <SpinnerContainer />;
    if (error || !recap) {
        return (
            <div className="recap-page">
                <Card>
                    <p>{t("session.sessionNotFound")}</p>
                    {back}
                </Card>
            </div>
        );
    }

    const columns = [
        {
            title: "",
            key: "rank",
            width: 48,
            render: (_: unknown, __: ParticipantRecapDto, index: number) => MEDALS[index] ?? index + 1,
        },
        { title: t("recap.who"), key: "user", render: (p: ParticipantRecapDto) => <UserBadge user={p.user} /> },
        { title: t("recap.pans"), dataIndex: "pan_count", key: "pans" },
        { title: "XP", key: "xp", render: (p: ParticipantRecapDto) => formatNumber(p.xp, language) },
        {
            title: t("recap.averageRating"),
            key: "average",
            render: (p: ParticipantRecapDto) => (p.average_rating === null ? "–" : formatRating(p.average_rating, language)),
        },
        { title: t("recap.ratingsGiven"), dataIndex: "ratings_given", key: "given" },
    ];

    return (
        <div className="recap-page">
            <Flex justify="space-between" align="center" wrap="wrap" gap={16} className="mb-24">
                <div>
                    <Title level={2} className="m-0">{recap.session.name}</Title>
                    <Text type="secondary">
                        {formatDate(recap.session.timestamp, language)}
                        {" · "}
                        {recap.session.active ? <Tag color="green">{t("recap.stillOpen")}</Tag> : <Tag>{t("recap.closed")}</Tag>}
                    </Text>
                </div>
                {back}
            </Flex>

            <Row gutter={[16, 16]} className="mb-24">
                <Col xs={8}>
                    <Card><Statistic title={t("recap.pans")} value={recap.pan_count} formatter={numberFormatter(language)} /></Card>
                </Col>
                <Col xs={8}>
                    <Card><Statistic title={t("recap.ratings")} value={recap.rating_count} formatter={numberFormatter(language)} /></Card>
                </Col>
                <Col xs={8}>
                    <Card><Statistic title={t("recap.participants")} value={recap.participants.length} formatter={numberFormatter(language)} /></Card>
                </Col>
            </Row>

            {recap.pan_count === 0 ? (
                <Card><Empty description={t("recap.nothingRolled")} /></Card>
            ) : (
                <>
                    <Row gutter={[16, 16]} className="mb-24">
                        {recap.best_pan && (
                            <Col xs={24} md={12}>
                                <PanHighlight icon={<StarOutlined />} title={t("recap.bestPan")} pan={recap.best_pan} />
                            </Col>
                        )}
                        {recap.boldest_pan && (
                            <Col xs={24} md={12}>
                                <PanHighlight
                                    icon={<FireOutlined />}
                                    title={t("recap.boldestPan")}
                                    pan={recap.boldest_pan.pan}
                                    extra={<Tag color="orange">{formatNumber(recap.boldest_pan.xp, language)} XP</Tag>}
                                />
                            </Col>
                        )}
                        {recap.worst_pan && (
                            <Col xs={24} md={12}>
                                <PanHighlight icon={<FrownOutlined />} title={t("recap.worstPan")} pan={recap.worst_pan} />
                            </Col>
                        )}
                        {recap.favorite_ingredient && (
                            <Col xs={24} md={12}>
                                <Card className="recap-highlight" title={<Flex gap={8} align="center"><TrophyOutlined />{t("recap.favoriteIngredient")}</Flex>}>
                                    <IngredientDisplay ingredient={recap.favorite_ingredient.ingredient} variant="card" />
                                    <Text type="secondary">
                                        {t("recap.inPans", { count: recap.favorite_ingredient.pan_count })}
                                    </Text>
                                </Card>
                            </Col>
                        )}
                    </Row>
                    {!recap.best_pan && <Text type="secondary">{t("recap.nothingRated")}</Text>}
                </>
            )}

            <Card title={t("recap.participants")} className="mt-24">
                <div className="recap-table">
                    <Table
                        rowKey={(p) => p.user.id}
                        columns={columns}
                        dataSource={recap.participants}
                        pagination={false}
                        size="middle"
                    />
                </div>
            </Card>
        </div>
    );
}
