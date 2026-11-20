import { Card, Col, Rate, Row, Space, Statistic, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { UserStatsDto } from "../../../api/generated/model";
import { formatNumber, numberFormatter, useLanguage } from "../../../lib/language";
import { displayName } from "../../../shared/displayName";
import { IngredientDisplay } from "../../../shared/IngredientDisplay/IngredientDisplay";
import "../profile.css";

const { Text } = Typography;

/** The user's records: their best session, favourite and best-rated ingredients, and biggest pan. */
export function ProfileHighlights({ stats }: { stats: Partial<UserStatsDto> }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const {
    most_pans_session: bestSession,
    favorite_ingredient: favorite,
    best_rated_ingredient: bestRated,
    most_ingredients_pan: biggestPan,
  } = stats;

  return (
    <>
      {bestSession && (
        <Card title={t("profile.bestSession")} className="mb-24">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Statistic title={t("profile.sessionName")} value={bestSession.session_name || t("common.notAvailable")} />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic title={t("profile.pansInSession")} value={bestSession.pan_count || 0} formatter={numberFormatter(language)} />
            </Col>
          </Row>
        </Card>
      )}

      {(favorite || bestRated) && (
        <Row gutter={[16, 16]} className="mb-24">
          {favorite && (
            <Col xs={24} md={12}>
              <Card title={t("profile.mostUsedIngredient")}>
                <IngredientDisplay ingredient={favorite} variant="badge" showTags={false} showIcon={true} />
              </Card>
            </Col>
          )}
          {bestRated && (
            <Col xs={24} md={12}>
              <Card title={t("profile.bestRatedIngredient")}>
                <div>
                  <IngredientDisplay ingredient={bestRated.ingredient} variant="badge" showTags={false} showIcon={true} />
                  {bestRated.avg_rating > 0 && (
                    <div className="mt-8">
                      <Rate disabled allowHalf value={bestRated.avg_rating} className="profile-rating" />
                      <Text type="secondary" className="ml-8">
                        {formatNumber(bestRated.avg_rating, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        <Card title={t("profile.biggestPan")} className="mb-24">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Statistic title={t("profile.panName")} value={displayName(biggestPan.name, t)} />
            </Col>
            <Col xs={24} sm={12}>
              <Statistic
                title={t("profile.ingredientCount")}
                value={biggestPan.ingredients.length}
                formatter={numberFormatter(language)}
              />
            </Col>
          </Row>
          {biggestPan.ingredients.length > 0 && (
            <div className="mt-16">
              <Text strong className="profile-ingredients-title">
                {t("profile.ingredients")}
              </Text>
              <Space wrap className="profile-ingredients">
                {biggestPan.ingredients.map((ingredient) => (
                  <div key={ingredient.id} className="mb-8">
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
