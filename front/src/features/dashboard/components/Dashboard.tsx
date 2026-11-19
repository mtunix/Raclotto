import { useState, useEffect } from "react";
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
  IngredientRatingDto,
  IngredientUsageDto,
  LeaderboardEntryDto,
  PanDto,
} from "../../../api/generated/model";
import { onErrorRetry } from "../../../lib/api/swrHooks";
import { IngredientDisplay } from "../../../shared/IngredientDisplay/IngredientDisplay";
import { displayName } from "../../../shared/displayName";
import { ItemList, ItemRow } from "../../../shared/ItemList/ItemList";
import { VectorGraphics } from "../../../lib/vectorGraphics";
import "./Dashboard.css";

const { Title, Text } = Typography;

interface RatingViewerProps {
  rating: number;
}

function RatingViewer(props: RatingViewerProps) {
  return (
    <Rate
      value={props.rating}
      disabled
      allowHalf
      style={{ fontSize: "1rem" }}
    />
  );
}

interface IngredientListGroupItemRatingProps {
  entry: IngredientRatingDto;
}

function IngredientListGroupItemRating(
  props: IngredientListGroupItemRatingProps,
) {
  const { t } = useTranslation();
  const { ingredient } = props.entry;
  const backgroundColor =
    ingredient.type === IngredientType.FILL ? "#f0f7ff" : "#fafafa";
  const icon =
    ingredient.type === IngredientType.FILL
      ? VectorGraphics.INGREDIENT
      : VectorGraphics.SAUCE;

  return (
    <ItemRow
      className="dashboard-ingredient-item"
      style={{ backgroundColor: backgroundColor }}
    >
      <div className="dashboard-ingredient-item-content">
        <span className="dashboard-ingredient-name">
          <span style={{ marginRight: "8px" }}>{icon}</span>
          {displayName(ingredient.name, t)}
        </span>
        <RatingViewer rating={props.entry.avg_rating} />
      </div>
    </ItemRow>
  );
}

interface IngredientListGroupItemCountProps {
  entry: IngredientUsageDto;
}

function IngredientListGroupItemCount(
  props: IngredientListGroupItemCountProps,
) {
  const { t } = useTranslation();
  const { ingredient } = props.entry;
  const backgroundColor =
    ingredient.type === IngredientType.FILL ? "#f0f7ff" : "#fafafa";
  const icon =
    ingredient.type === IngredientType.FILL
      ? VectorGraphics.INGREDIENT
      : VectorGraphics.SAUCE;

  return (
    <ItemRow
      className="dashboard-ingredient-item"
      style={{ backgroundColor: backgroundColor }}
    >
      <div className="dashboard-ingredient-item-content">
        <span className="dashboard-ingredient-name">
          <span style={{ marginRight: "8px" }}>{icon}</span>
          {displayName(ingredient.name, t)}
        </span>
        <span className="dashboard-ingredient-count">
          {props.entry.pan_count}
        </span>
      </div>
    </ItemRow>
  );
}

interface PanListItemProps {
  pan: PanDto;
}

function PanListItem(props: PanListItemProps) {
  const { t } = useTranslation();

  return (
    <ItemRow className="dashboard-pan-item">
      <div style={{ width: "100%" }}>
        <div className="dashboard-pan-header">
          <div style={{ flex: 1 }}>
            <div className="dashboard-pan-title">{displayName(props.pan.name, t)}</div>
            <div className="dashboard-pan-subtitle">
              {t("history.consumedBy")} {props.pan.author?.name}
            </div>
          </div>
          <div className="dashboard-pan-rating">
            <RatingViewer rating={props.pan.rating} />
          </div>
        </div>
        <div>
          <Space wrap size={[4, 4]}>
            {props.pan.ingredients
              .filter((ingredient) => ingredient.type === IngredientType.FILL)
              .map((ingredient) => (
                <IngredientDisplay
                  key={`fill-${ingredient.id}`}
                  ingredient={ingredient}
                  variant="badge"
                  showTags={false}
                  showIcon={true}
                />
              ))}
            {props.pan.ingredients
              .filter((ingredient) => ingredient.type === IngredientType.SAUCE)
              .map((ingredient) => (
                <IngredientDisplay
                  key={`sauce-${ingredient.id}`}
                  ingredient={ingredient}
                  variant="badge"
                  showTags={false}
                  showIcon={true}
                />
              ))}
          </Space>
        </div>
      </div>
    </ItemRow>
  );
}

interface LeaderboardListItemProps {
  entry: LeaderboardEntryDto;
  currentUserId?: number;
}

function LeaderboardListItem(props: LeaderboardListItemProps) {
  const { t } = useTranslation();
  const isTopThree = props.entry.rank <= 3;
  const isCurrentUser = props.currentUserId === props.entry.user_id;

  // Subtle styling for top 3, normal for others
  const backgroundColor = isTopThree
    ? isCurrentUser
      ? "#f0f7ff"
      : "#fafafa"
    : isCurrentUser
      ? "#f0f7ff"
      : "#ffffff";
  const borderColor = isTopThree
    ? props.entry.rank === 1
      ? "#d4af37"
      : props.entry.rank === 2
        ? "#c0c0c0"
        : "#cd7f32"
    : "transparent";
  const borderWidth = isTopThree ? "1px" : "0px";
  const padding = isTopThree ? "10px" : "8px";
  const fontSize = isTopThree ? "0.95rem" : "0.9rem";

  return (
    <ItemRow
      style={{
        backgroundColor: backgroundColor,
        marginBottom: "4px",
        borderRadius: "4px",
        padding: padding,
        border: `${borderWidth} solid ${borderColor}`,
        borderLeft: isTopThree ? `3px solid ${borderColor}` : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            minWidth: 0,
          }}
        >
          <Text
            type="secondary"
            style={{
              fontSize: isTopThree ? "0.9rem" : "0.8rem",
              minWidth: "24px",
              textAlign: "center",
              fontWeight: isTopThree ? 600 : 400,
            }}
          >
            {props.entry.rank}
          </Text>
          <Text
            ellipsis
            strong={isCurrentUser || isTopThree}
            style={{ fontSize: fontSize, flex: 1 }}
          >
            {props.entry.name}
            {isCurrentUser && (
              <Tag
                color="default"
                style={{
                  marginLeft: "6px",
                  fontSize: "0.75rem",
                  padding: "0 4px",
                  lineHeight: "16px",
                }}
              >
                {t("dashboard.you")}
              </Tag>
            )}
          </Text>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginLeft: "8px",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>
            {VectorGraphics.ACHIEVEMENTS}
          </span>
          <Text
            type="secondary"
            style={{ fontSize: "0.8rem", fontWeight: 500 }}
          >
            {props.entry.total_points}
          </Text>
        </div>
      </div>
    </ItemRow>
  );
}

export function Dashboard() {
  const { t } = useTranslation();
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
    <div style={{ margin: "0", padding: "0" }}>
      <Row style={{ marginBottom: "24px" }}>
        <Col
          span={24}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
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
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card
            styles={{
              body: {
                padding: "20px",
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            <Title
              level={5}
              style={{
                marginBottom: "16px",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.022em",
                color: "#1d1d1f",
              }}
            >
              {t("dashboard.pans")}
            </Title>
            <ItemList
              items={pans}
              rowKey={(pan) => pan.id}
              renderItem={(pan: PanDto) => <PanListItem pan={pan} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card
            styles={{
              body: {
                padding: "20px",
                maxHeight: "600px",
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            <Title
              level={5}
              style={{
                marginBottom: "16px",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.022em",
                color: "#1d1d1f",
              }}
            >
              {t("ingredient.ingredients")}{" "}
              <Text
                type="secondary"
                style={{ fontSize: "15px", fontWeight: 400 }}
              >
                ({t("dashboard.rating")})
              </Text>
            </Title>
            <ItemList
              items={limitedIngredientsRating}
              rowKey={(entry) => entry.ingredient.id}
              renderItem={(entry) => <IngredientListGroupItemRating entry={entry} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card
            styles={{
              body: {
                padding: "20px",
                maxHeight: "600px",
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            <Title
              level={5}
              style={{
                marginBottom: "16px",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.022em",
                color: "#1d1d1f",
              }}
            >
              {t("ingredient.ingredients")}{" "}
              <Text
                type="secondary"
                style={{ fontSize: "15px", fontWeight: 400 }}
              >
                ({t("dashboard.usage")})
              </Text>
            </Title>
            <ItemList
              items={limitedIngredientsUsage}
              rowKey={(entry) => entry.ingredient.id}
              renderItem={(entry) => <IngredientListGroupItemCount entry={entry} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card
            styles={{
              body: {
                padding: "20px",
                maxHeight: "600px",
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            <Title
              level={5}
              style={{
                marginBottom: "16px",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.022em",
                color: "#1d1d1f",
              }}
            >
              {t("dashboard.leaderboard")}
            </Title>
            <ItemList
              items={limitedLeaderboard}
              rowKey={(entry) => entry.user_id}
              renderItem={(entry) => (
                <LeaderboardListItem entry={entry} currentUserId={currentUser?.id} />
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
