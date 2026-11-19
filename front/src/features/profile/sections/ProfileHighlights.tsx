import React from "react";
import { Card, Col, Rate, Row, Space, Statistic, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { UserStatsDto } from "../../../api/generated/model";
import { displayName } from "../../../shared/displayName";
import { IngredientDisplay } from "../../../shared/IngredientDisplay/IngredientDisplay";

const { Text } = Typography;

/** The user's records: their best session, favourite and best-rated ingredients, and biggest pan. */
export function ProfileHighlights({ stats }: { stats: Partial<UserStatsDto> }) {
  const { t } = useTranslation();
  const {
    most_pans_session: bestSession,
    favorite_ingredient: favorite,
    best_rated_ingredient: bestRated,
    most_ingredients_pan: biggestPan,
  } = stats;

  return (
    <>
      {bestSession && (
        <Card title={t("profile.bestSession") || "Best Session"} style={{ marginBottom: "24px" }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Statistic title={t("profile.sessionName") || "Session"} value={bestSession.session_name || "N/A"} />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic title={t("profile.pansInSession") || "Pans Created"} value={bestSession.pan_count || 0} />
            </Col>
          </Row>
        </Card>
      )}

      {(favorite || bestRated) && (
        <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
          {favorite && (
            <Col xs={24} md={12}>
              <Card title={t("profile.mostUsedIngredient")}>
                <IngredientDisplay ingredient={favorite} variant="badge" showTags={false} showIcon={true} />
              </Card>
            </Col>
          )}
          {bestRated && (
            <Col xs={24} md={12}>
              <Card title={t("profile.bestRatedIngredient") || "Best Rated Ingredient"}>
                <div>
                  <IngredientDisplay ingredient={bestRated.ingredient} variant="badge" showTags={false} showIcon={true} />
                  {bestRated.avg_rating > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <Rate disabled allowHalf value={bestRated.avg_rating} style={{ fontSize: "14px" }} />
                      <Text type="secondary" style={{ marginLeft: "8px" }}>
                        {bestRated.avg_rating.toFixed(2)}
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {biggestPan && (
        <Card title={t("profile.biggestPan") || "Biggest Pan"} style={{ marginBottom: "24px" }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Statistic title={t("profile.panName") || "Pan Name"} value={displayName(biggestPan.name, t)} />
            </Col>
            <Col xs={24} sm={12}>
              <Statistic
                title={t("profile.ingredientCount") || "Ingredient Count"}
                value={biggestPan.ingredients.length}
              />
            </Col>
          </Row>
          {biggestPan.ingredients.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <Text strong style={{ display: "block", marginBottom: "12px" }}>
                {t("profile.ingredients") || "Ingredients"}
              </Text>
              <Space wrap style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {biggestPan.ingredients.map((ingredient) => (
                  <div key={ingredient.id} style={{ marginBottom: "8px" }}>
                    <IngredientDisplay ingredient={ingredient} variant="badge" showTags={true} showIcon={true} />
                  </div>
                ))}
              </Space>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
