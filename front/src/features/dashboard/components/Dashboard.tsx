import { useState, useEffect, type ReactNode } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Rate,
  Space,
  Tag,
} from "antd";
import {
  CompressOutlined,
  ExpandOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../../AuthSlice";
import { useAppStore } from "../../../AppSlice";
import { useTranslation } from "react-i18next";
import { useGetStats } from "../../../api/generated/endpoints/stats/stats";
import { IngredientType } from "../../../api/generated/model";
import type {
  IngredientDto,
  IngredientRatingDto,
  IngredientUsageDto,
  LeaderboardEntryDto,
  PanDto,
} from "../../../api/generated/model";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { IngredientDisplay } from "../../../shared/IngredientDisplay/IngredientDisplay";
import { displayName } from "../../../shared/displayName";
import { ItemList, ItemRow } from "../../../shared/ItemList/ItemList";
import { formatNumber, useLanguage } from "../../../lib/language";
import { VectorGraphics } from "../../../lib/vectorGraphics";
import "./Dashboard.css";

const { Title, Text } = Typography;

function RatingViewer({ rating }: { rating: number }) {
  return <Rate value={rating} disabled allowHalf className="dashboard-rating" />;
}

/** An ingredient in one of the ingredient lists, with its score at the end. */
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

function PanListItem({ pan }: { pan: PanDto }) {
  const { t } = useTranslation();
  const fills = pan.ingredients.filter((ingredient) => ingredient.type === IngredientType.FILL);
  const sauces = pan.ingredients.filter((ingredient) => ingredient.type === IngredientType.SAUCE);

  return (
    <ItemRow className="dashboard-pan-item">
      <div className="dashboard-pan-body">
        <div className="dashboard-pan-header">
          <div className="dashboard-pan-heading">
            <div className="dashboard-pan-title">{displayName(pan.name, t)}</div>
            <div className="dashboard-pan-subtitle">
              {t("history.consumedBy")} {pan.author?.name}
            </div>
          </div>
          <div className="dashboard-pan-rating">
            <RatingViewer rating={pan.rating} />
          </div>
        </div>
        <Space wrap size={[4, 4]}>
          {[...fills, ...sauces].map((ingredient) => (
            <IngredientDisplay
              key={`${ingredient.type}-${ingredient.id}`}
              ingredient={ingredient}
              variant="badge"
              showTags={false}
              showIcon={true}
            />
          ))}
        </Space>
      </div>
    </ItemRow>
  );
}

function LeaderboardListItem({ entry, currentUserId }: { entry: LeaderboardEntryDto; currentUserId?: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
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
            {isCurrentUser && (
              <Tag color="default" className="dashboard-leader-you">
                {t("dashboard.you")}
              </Tag>
            )}
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
}

function DashboardCard({ title, scroll = true, children }: { title: ReactNode; scroll?: boolean; children: ReactNode }) {
  return (
    <Col xs={24} sm={12} md={12} lg={6}>
      <Card classNames={{ body: scroll ? "dashboard-card-body dashboard-card-body-scroll" : "dashboard-card-body" }}>
        <Title level={5} className="dashboard-card-title">
          {title}
        </Title>
        {children}
      </Card>
    </Col>
  );
}

export function Dashboard() {
  const { t } = useTranslation();
  const language = useLanguage();
  const session = useAppStore((state) => state.session);
  const currentUser = useAuthStore((state) => state.user);
  const removeWidthCap = useAppStore((state) => state.removeWidthCap);
  const setRemoveWidthCap = useAppStore((state) => state.setRemoveWidthCap);
  const [isGlobal, setIsGlobal] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 568);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 568);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: statsData } = useGetStats(
    isGlobal || !session?.key ? undefined : { session_key: session.key },
    {
      swr: {
        onErrorRetry,
        refreshInterval: 5000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
      },
    },
  );

  // Extract data from stats response
  const pans = statsData?.pans || [];
  const ingredientsRating = statsData?.ingredients_top_rated || [];
  const ingredientsUsage = statsData?.ingredients_most_used || [];
  const leaderboard = statsData?.leaderboard || [];

  // Limit items for other sections, but show all pans
  const limitedIngredientsRating = ingredientsRating.slice(0, 5);
  const limitedIngredientsUsage = ingredientsUsage.slice(0, 5);
  const limitedLeaderboard = leaderboard.slice(0, 8);

  return (
    <div>
      <Row className="dashboard-toolbar">
        <Col span={24} className="dashboard-toolbar-buttons">
          <Button
            type={isGlobal ? "primary" : "default"}
            onClick={() => setIsGlobal(!isGlobal)}
            size="large"
          >
            {isGlobal ? t("dashboard.global") : t("dashboard.session")}
          </Button>
          <Button
            type="default"
            icon={removeWidthCap ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={() => setRemoveWidthCap(!removeWidthCap)}
            size="large"
            className="remove-width-cap-button"
          >
            {!isSmallScreen &&
              (removeWidthCap ? t("dashboard.capWidth") : t("dashboard.removeWidthCap"))}
          </Button>
        </Col>
      </Row>
      <Row gutter={[24, 24]}>
        <DashboardCard title={t("dashboard.pans")} scroll={false}>
          <ItemList items={pans} rowKey={(pan) => pan.id} renderItem={(pan: PanDto) => <PanListItem pan={pan} />} />
        </DashboardCard>
        <DashboardCard
          title={
            <>
              {t("ingredient.ingredients")} <Text type="secondary" className="dashboard-card-subtitle">({t("dashboard.rating")})</Text>
            </>
          }
        >
          <ItemList
            items={limitedIngredientsRating}
            rowKey={(entry) => entry.ingredient.id}
            renderItem={(entry: IngredientRatingDto) => (
              <IngredientStatRow ingredient={entry.ingredient}>
                <RatingViewer rating={entry.avg_rating} />
              </IngredientStatRow>
            )}
          />
        </DashboardCard>
        <DashboardCard
          title={
            <>
              {t("ingredient.ingredients")} <Text type="secondary" className="dashboard-card-subtitle">({t("dashboard.usage")})</Text>
            </>
          }
        >
          <ItemList
            items={limitedIngredientsUsage}
            rowKey={(entry) => entry.ingredient.id}
            renderItem={(entry: IngredientUsageDto) => (
              <IngredientStatRow ingredient={entry.ingredient}>
                <span className="dashboard-ingredient-count">{formatNumber(entry.pan_count, language)}</span>
              </IngredientStatRow>
            )}
          />
        </DashboardCard>
        <DashboardCard title={t("dashboard.leaderboard")}>
          <ItemList
            items={limitedLeaderboard}
            rowKey={(entry) => entry.user_id}
            renderItem={(entry) => <LeaderboardListItem entry={entry} currentUserId={currentUser?.id} />}
          />
        </DashboardCard>
      </Row>
    </div>
  );
}
