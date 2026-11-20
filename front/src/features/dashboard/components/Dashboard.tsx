import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Button, Card, Col, Empty, Flex, Rate, Row, Segmented, Statistic, Tabs, Tag, Typography } from "antd";
import {
  CompressOutlined,
  ExpandOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ThunderboltOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../../AuthSlice";
import { useAppStore } from "../../../AppSlice";
import { useGetStats } from "../../../api/generated/endpoints/stats/stats";
import { useGetSessionRecap } from "../../../api/generated/endpoints/sessions/sessions";
import { EventType, IngredientType } from "../../../api/generated/model";
import type {
  EventDto,
  IngredientDto,
  IngredientRatingDto,
  IngredientUsageDto,
  LeaderboardEntryDto,
  PanDto,
  ParticipantRecapDto,
  UserSummaryDto,
} from "../../../api/generated/model";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { formatNumber, formatRating, formatTimeAgo, numberFormatter, useLanguage } from "../../../lib/language";
import { getProfilePictureUrl } from "../../../lib/utils/profilePictureUrl";
import { VectorGraphics } from "../../../lib/vectorGraphics";
import { eventMessage } from "../../../shared/EventDisplay/sessionEvents";
import { IngredientDisplay } from "../../../shared/IngredientDisplay/IngredientDisplay";
import { IngredientOfTheHourCard } from "../../../shared/IngredientOfTheHour/IngredientOfTheHourCard";
import { ItemList, ItemRow } from "../../../shared/ItemList/ItemList";
import { JoinQr } from "../../../shared/JoinLink/JoinLink";
import { displayName } from "../../../shared/displayName";
import { feedItems, type FeedItem } from "../dashboardFeed";
import "./Dashboard.css";

const { Title, Text } = Typography;

const MEDALS = ["🥇", "🥈", "🥉"];
const POLL = { onErrorRetry, refreshInterval: 5000, revalidateOnFocus: true, revalidateOnReconnect: true };

/** The current time, ticking every half minute, so "3 minutes ago" keeps up without new data. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** Whether `element` fills the screen, and a toggle; for the TV at the table. */
function useFullscreen(element: React.RefObject<HTMLDivElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === element.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [element]);
  const supported = typeof document.documentElement.requestFullscreen === "function";
  const toggle = () => {
    const request = fullscreen ? document.exitFullscreen() : element.current?.requestFullscreen();
    void request?.catch((e: unknown) => console.error("Fullscreen failed:", e));
  };
  return { fullscreen, supported, toggle };
}

function UserAvatar({ user, size = 36 }: { user: UserSummaryDto | null | undefined; size?: number }) {
  return (
    <Avatar
      size={size}
      src={user?.profile_picture ? getProfilePictureUrl(user.profile_picture) : undefined}
      style={{ backgroundColor: user?.color ?? undefined }}
      className="dashboard-avatar"
    >
      {user?.name.charAt(0).toUpperCase() ?? "?"}
    </Avatar>
  );
}

function DashboardCard({ title, extra, children, className }: {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`dashboard-card ${className ?? ""}`} classNames={{ body: "dashboard-card-body" }}>
      <Flex justify="space-between" align="center" className="dashboard-card-header">
        <Title level={5} className="dashboard-card-title">
          {title}
        </Title>
        {extra}
      </Flex>
      {children}
    </Card>
  );
}

function PanFeedItem({ pan, now }: { pan: PanDto; now: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const fills = pan.ingredients.filter((ingredient) => ingredient.type === IngredientType.FILL);
  const sauces = pan.ingredients.filter((ingredient) => ingredient.type === IngredientType.SAUCE);

  return (
    <li className="dashboard-feed-item dashboard-feed-pan">
      <UserAvatar user={pan.author} size={44} />
      <div className="dashboard-feed-content">
        <Flex justify="space-between" align="baseline" gap={8} wrap="wrap">
          <Text className="dashboard-feed-headline">
            {t("dashboard.rolled", { name: pan.author?.name ?? "?" })}{" "}
            <Text strong>{displayName(pan.name, t)}</Text>
          </Text>
          <Text type="secondary" className="dashboard-feed-time">
            {formatTimeAgo(pan.timestamp, language, now)}
          </Text>
        </Flex>
        <Flex wrap="wrap" gap={4} className="dashboard-feed-ingredients">
          {[...fills, ...sauces].map((ingredient) => (
            <IngredientDisplay
              key={`${ingredient.type}-${ingredient.id}`}
              ingredient={ingredient}
              variant="badge"
              showTags={false}
              showIcon={true}
            />
          ))}
        </Flex>
        <Flex wrap="wrap" align="center" gap={8} className="dashboard-feed-meta">
          {pan.ratings.length > 0 ? (
            <>
              <Rate value={pan.rating} disabled allowHalf className="dashboard-rating" />
              <Text type="secondary">{t("recap.ratingCount", { count: pan.ratings.length })}</Text>
            </>
          ) : (
            <Text type="secondary">{t("dashboard.notRatedYet")}</Text>
          )}
          {pan.ingredient_of_the_hour && (
            <Tag color="gold" icon={<FireOutlined />}>
              {t("ingredientOfTheHour.title")}
            </Tag>
          )}
          {pan.preparation_type && <Tag>{pan.preparation_type.name}</Tag>}
        </Flex>
      </div>
    </li>
  );
}

function EventFeedItem({ event, now }: { event: EventDto; now: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const hour = event.event_type === EventType.ingredient_of_the_hour;

  return (
    <li className={`dashboard-feed-item dashboard-feed-event ${hour ? "dashboard-feed-event-hour" : ""}`}>
      <span className="dashboard-feed-event-icon" aria-hidden>
        {hour ? <FireOutlined /> : <ThunderboltOutlined />}
      </span>
      <Flex justify="space-between" align="baseline" gap={8} wrap="wrap" className="dashboard-feed-content">
        <Text strong>{eventMessage(event, t)}</Text>
        <Text type="secondary" className="dashboard-feed-time">
          {formatTimeAgo(event.created_at, language, now)}
        </Text>
      </Flex>
    </li>
  );
}

function Feed({ items }: { items: FeedItem[] }) {
  const { t } = useTranslation();
  const now = useNow();

  if (items.length === 0) {
    return <Empty description={t("dashboard.feedEmpty")} />;
  }
  return (
    <ul className="dashboard-feed" aria-live="polite">
      {items.map((item) =>
        item.kind === "pan" ? (
          <PanFeedItem key={item.key} pan={item.pan} now={now} />
        ) : (
          <EventFeedItem key={item.key} event={item.event} now={now} />
        ),
      )}
    </ul>
  );
}

function Standings({ participants, currentUserId }: { participants: ParticipantRecapDto[]; currentUserId?: number }) {
  const { t } = useTranslation();
  const language = useLanguage();

  if (participants.length === 0) {
    return <Empty description={t("dashboard.nobodyYet")} />;
  }
  return (
    <ol className="dashboard-standings">
      {participants.map((participant, index) => (
        <li
          key={participant.user.id}
          className={`dashboard-standing ${participant.user.id === currentUserId ? "dashboard-standing-me" : ""}`}
        >
          <span className="dashboard-standing-rank">{MEDALS[index] ?? index + 1}</span>
          <UserAvatar user={participant.user} />
          <Flex vertical className="dashboard-standing-who">
            <Text strong ellipsis>
              {participant.user.name}
              {participant.user.id === currentUserId && (
                <Tag className="dashboard-leader-you">{t("dashboard.you")}</Tag>
              )}
            </Text>
            <Text type="secondary" className="dashboard-standing-detail">
              {t("dashboard.panCount", { count: participant.pan_count })}
              {participant.average_rating !== null && ` · ${formatRating(participant.average_rating, language)} ★`}
            </Text>
          </Flex>
          <Text strong className="dashboard-standing-xp">
            {formatNumber(participant.xp, language)} XP
          </Text>
        </li>
      ))}
    </ol>
  );
}

function IngredientStatRow({ ingredient, children }: { ingredient: IngredientDto; children: ReactNode }) {
  const { t } = useTranslation();
  const fill = ingredient.type === IngredientType.FILL;

  return (
    <ItemRow className={`dashboard-ingredient-item ${fill ? "dashboard-ingredient-fill" : "dashboard-ingredient-sauce"}`}>
      <div className="dashboard-ingredient-item-content">
        <span className="dashboard-ingredient-name">
          <span className="dashboard-ingredient-icon">{fill ? VectorGraphics.INGREDIENT : VectorGraphics.SAUCE}</span>
          {displayName(ingredient.name, t)}
        </span>
        {children}
      </div>
    </ItemRow>
  );
}

function IngredientRankings({ rated, used }: { rated: IngredientRatingDto[]; used: IngredientUsageDto[] }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <Tabs
      size="small"
      items={[
        {
          key: "rated",
          label: t("dashboard.rating"),
          children: (
            <ItemList
              items={rated.slice(0, 5)}
              rowKey={(entry) => entry.ingredient.id}
              renderItem={(entry: IngredientRatingDto) => (
                <IngredientStatRow ingredient={entry.ingredient}>
                  <Rate value={entry.avg_rating} disabled allowHalf className="dashboard-rating" />
                </IngredientStatRow>
              )}
            />
          ),
        },
        {
          key: "used",
          label: t("dashboard.usage"),
          children: (
            <ItemList
              items={used.slice(0, 5)}
              rowKey={(entry) => entry.ingredient.id}
              renderItem={(entry: IngredientUsageDto) => (
                <IngredientStatRow ingredient={entry.ingredient}>
                  <span className="dashboard-ingredient-count">{formatNumber(entry.pan_count, language)}</span>
                </IngredientStatRow>
              )}
            />
          ),
        },
      ]}
    />
  );
}

function Leaderboard({ entries, currentUserId }: { entries: LeaderboardEntryDto[]; currentUserId?: number }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <ItemList
      items={entries.slice(0, 8)}
      rowKey={(entry) => entry.user_id}
      renderItem={(entry) => {
        const isTopThree = entry.rank <= 3;
        const isCurrentUser = currentUserId === entry.user_id;
        const className = [
          "dashboard-leader",
          isTopThree && `dashboard-leader-top dashboard-leader-rank-${entry.rank}`,
          isCurrentUser && "dashboard-leader-me",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <ItemRow className={className}>
            <div className="dashboard-leader-content">
              <div className="dashboard-leader-who">
                <Text type="secondary" className="dashboard-leader-rank">
                  {entry.rank}
                </Text>
                <Text ellipsis strong={isCurrentUser || isTopThree} className="dashboard-leader-name">
                  {entry.name}
                  {isCurrentUser && <Tag className="dashboard-leader-you">{t("dashboard.you")}</Tag>}
                </Text>
              </div>
              <div className="dashboard-leader-points">
                <span className="dashboard-leader-points-icon">{VectorGraphics.ACHIEVEMENTS}</span>
                <Text type="secondary" className="dashboard-leader-points-value">
                  {formatNumber(entry.total_points, language)}
                </Text>
              </div>
            </div>
          </ItemRow>
        );
      }}
    />
  );
}

/** The session at a glance, made to run on a screen at the table: a live feed, tonight's standings and how to join. */
export function Dashboard() {
  const { t } = useTranslation();
  const language = useLanguage();
  const session = useAppStore((state) => state.session);
  const currentUser = useAuthStore((state) => state.user);
  const removeWidthCap = useAppStore((state) => state.removeWidthCap);
  const setRemoveWidthCap = useAppStore((state) => state.setRemoveWidthCap);
  const [scope, setScope] = useState<"session" | "global">("session");
  const containerRef = useRef<HTMLDivElement>(null);
  const { fullscreen, supported, toggle } = useFullscreen(containerRef);
  const sessionKey = session?.key ?? "";
  const ofSession = scope === "session" && !!sessionKey;

  const { data: stats } = useGetStats(ofSession ? { session_key: sessionKey } : undefined, { swr: POLL });
  const { data: recap } = useGetSessionRecap({ session_key: sessionKey }, { swr: { ...POLL, enabled: ofSession } });

  const pans = stats?.pans ?? [];
  const events = ofSession ? (stats?.events ?? []) : [];

  return (
    <div ref={containerRef} className={`dashboard ${fullscreen ? "dashboard-fullscreen" : ""}`}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={8} className="dashboard-toolbar">
        <Segmented<"session" | "global">
          size="large"
          value={scope}
          onChange={(value) => setScope(value)}
          options={[
            { value: "session", label: t("dashboard.session") },
            { value: "global", label: t("dashboard.global") },
          ]}
        />
        <Flex gap={8}>
          {supported && (
            <Button size="large" icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={toggle}>
              <span className="dashboard-toolbar-label">
                {fullscreen ? t("dashboard.exitFullscreen") : t("dashboard.fullscreen")}
              </span>
            </Button>
          )}
          {!fullscreen && (
            <Button
              size="large"
              icon={removeWidthCap ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={() => setRemoveWidthCap(!removeWidthCap)}
            >
              <span className="dashboard-toolbar-label">
                {removeWidthCap ? t("dashboard.capWidth") : t("dashboard.removeWidthCap")}
              </span>
            </Button>
          )}
        </Flex>
      </Flex>

      {ofSession && session && (
        <Row gutter={[16, 16]} className="dashboard-hero">
          <Col xs={24} lg={16}>
            <Flex vertical gap={16} className="full-height">
              <Row gutter={[16, 16]}>
                {[
                  { key: "pans", title: t("dashboard.pansTonight"), value: recap?.pan_count ?? 0 },
                  { key: "people", title: t("dashboard.atTheTable"), value: recap?.participants.length ?? 0 },
                  { key: "ratings", title: t("dashboard.ratings"), value: recap?.rating_count ?? 0 },
                ].map((tile) => (
                  <Col key={tile.key} xs={8}>
                    <Card className="dashboard-tile" classNames={{ body: "dashboard-tile-body" }}>
                      <Statistic
                        title={tile.title}
                        value={tile.value}
                        formatter={numberFormatter(language)}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
              <IngredientOfTheHourCard sessionKey={sessionKey} />
              {recap?.favorite_ingredient && (
                <Text type="secondary">
                  {t("dashboard.favorite", {
                    ingredient: displayName(recap.favorite_ingredient.ingredient.name, t),
                    count: recap.favorite_ingredient.pan_count,
                  })}
                </Text>
              )}
            </Flex>
          </Col>
          <Col xs={24} lg={8}>
            <Card className="dashboard-join" classNames={{ body: "dashboard-join-body" }}>
              <Title level={5} className="dashboard-card-title">
                {t("join.scanToJoin")}
              </Title>
              <JoinQr session={session} size={fullscreen ? 220 : 160} />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <DashboardCard
            title={ofSession ? t("dashboard.liveFeed") : t("dashboard.pans")}
            extra={<span className="dashboard-live-dot" aria-label={t("dashboard.live")} />}
          >
            <Feed items={feedItems(pans, events)} />
          </DashboardCard>
        </Col>
        <Col xs={24} lg={10}>
          <Flex vertical gap={16}>
            {ofSession ? (
              <DashboardCard title={t("dashboard.tonight")}>
                <Standings participants={recap?.participants ?? []} currentUserId={currentUser?.id} />
              </DashboardCard>
            ) : (
              <DashboardCard title={t("dashboard.leaderboard")}>
                <Leaderboard entries={stats?.leaderboard ?? []} currentUserId={currentUser?.id} />
              </DashboardCard>
            )}
            <DashboardCard title={t("ingredient.ingredients")}>
              <IngredientRankings
                rated={stats?.ingredients_top_rated ?? []}
                used={stats?.ingredients_most_used ?? []}
              />
            </DashboardCard>
          </Flex>
        </Col>
      </Row>
    </div>
  );
}
