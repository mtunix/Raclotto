import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Statistic,
  Progress,
  Divider,
  Rate,
  List,
  Space,
  Tag,
  Switch,
} from "antd";
import {
  TrophyOutlined,
  FireOutlined,
  StarOutlined,
  CompressOutlined,
  ExpandOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../../AuthSlice";
import { useAppStore } from "../../../AppSlice";
import { useTranslation } from "react-i18next";
import { Pan } from "../../../model/pan";
import { Ingredient, IngredientType } from "../../../model/ingredient";
import { LeaderboardEntry } from "../../../lib/api/types";
import { IngredientDisplay } from "../../../shared/IngredientDisplay/IngredientDisplay";
import { VectorGraphics } from "../../../lib/vectorGraphics";
import { useStats } from "../../../lib/api/swrHooks";
import "./Dashboard.css";

const { Title, Text } = Typography;

interface IngredientWithRating extends Ingredient {
  avg_rating: number;
}

interface IngredientWithCount extends Ingredient {
  pan_count: number;
}

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
  ingredient: IngredientWithRating;
}

function IngredientListGroupItemRating(
  props: IngredientListGroupItemRatingProps,
) {
  const backgroundColor =
    props.ingredient.type === IngredientType.FILL ? "#f0f7ff" : "#fafafa";

  return (
    <List.Item
      className="dashboard-ingredient-item"
      style={{ backgroundColor: backgroundColor }}
    >
      <div className="dashboard-ingredient-item-content">
        <span className="dashboard-ingredient-name">
          {props.ingredient.name}
        </span>
        <RatingViewer rating={props.ingredient.avg_rating} />
      </div>
    </List.Item>
  );
}

interface IngredientListGroupItemCountProps {
  ingredient: IngredientWithCount;
}

function IngredientListGroupItemCount(
  props: IngredientListGroupItemCountProps,
) {
  const backgroundColor =
    props.ingredient.type === IngredientType.FILL ? "#f0f7ff" : "#fafafa";

  return (
    <List.Item
      className="dashboard-ingredient-item"
      style={{ backgroundColor: backgroundColor }}
    >
      <div className="dashboard-ingredient-item-content">
        <span className="dashboard-ingredient-name">
          {props.ingredient.name}
        </span>
        <span className="dashboard-ingredient-count">
          {props.ingredient.pan_count}
        </span>
      </div>
    </List.Item>
  );
}

interface PanListItemProps {
  pan: Pan;
}

function PanListItem(props: PanListItemProps) {
  const { t } = useTranslation();

  return (
    <List.Item className="dashboard-pan-item">
      <div style={{ width: "100%" }}>
        <div className="dashboard-pan-header">
          <div style={{ flex: 1 }}>
            <div className="dashboard-pan-title">{props.pan.name}</div>
            <div className="dashboard-pan-subtitle">
              {t("history.consumedBy")} {props.pan.user}
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
    </List.Item>
  );
}

interface LeaderboardListItemProps {
  entry: LeaderboardEntry;
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
    <List.Item
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
                {t("dashboard.you") || "You"}
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
    </List.Item>
  );
}

export function Dashboard() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const currentUser = useAuthStore((state) => state.user);
  const removeWidthCap = useAppStore((state) => state.removeWidthCap);
  const setRemoveWidthCap = useAppStore((state) => state.setRemoveWidthCap);
  const [isGlobal, setIsGlobal] = useState(true);

  // Use SWR hooks for data fetching with automatic revalidation
  const { data: statsData } = useStats(session?.key, isGlobal);

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
          <div>
            <Tag
              onClick={() => setIsGlobal(!isGlobal)}
              style={{
                backgroundColor: isGlobal ? "#1890ff" : "#f0f0f0",
                borderColor: isGlobal ? "#1890ff" : "#d9d9d9",
                color: isGlobal ? "#ffffff" : "#595959",
                cursor: "pointer",
                height: "40px",
                lineHeight: "38px",
                padding: "0 16px",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "6px",
                border: "1px solid",
                transition: "all 0.2s ease",
              }}
            >
              {isGlobal ? "Global" : "Session"}
            </Tag>
          </div>
          <Button
            type="default"
            icon={removeWidthCap ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={() => setRemoveWidthCap(!removeWidthCap)}
            size="large"
          >
            {removeWidthCap ? "Cap Width" : "Remove Width Cap"}
          </Button>
        </Col>
      </Row>
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card
            bodyStyle={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
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
              Pans
            </Title>
            <List
              dataSource={pans}
              renderItem={(pan: Pan) => (
                <PanListItem key={`pan-${pan.id}`} pan={pan} />
              )}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card
            bodyStyle={{
              padding: "20px",
              maxHeight: "600px",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
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
            <List
              dataSource={limitedIngredientsRating}
              renderItem={(ingredient) => (
                <IngredientListGroupItemRating
                  key={`ingredient-${ingredient.id}`}
                  ingredient={ingredient}
                />
              )}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card
            bodyStyle={{
              padding: "20px",
              maxHeight: "600px",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
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
            <List
              dataSource={limitedIngredientsUsage}
              renderItem={(ingredient) => (
                <IngredientListGroupItemCount
                  key={`ingredient-${ingredient.id}`}
                  ingredient={ingredient}
                />
              )}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12} lg={6}>
          <Card
            bodyStyle={{
              padding: "20px",
              maxHeight: "600px",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
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
              {t("dashboard.leaderboard") || "Leaderboard"}
            </Title>
            <List
              dataSource={limitedLeaderboard}
              renderItem={(entry) => (
                <LeaderboardListItem
                  key={`leaderboard-${entry.user_id}`}
                  entry={entry}
                  currentUserId={currentUser?.id}
                />
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
