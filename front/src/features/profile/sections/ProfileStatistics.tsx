import type { ComponentProps } from "react";
import { Card, Col, Row, Statistic } from "antd";
import { useTranslation } from "react-i18next";
import type { UserStatsDto } from "../../../api/generated/model";
import { VectorGraphics } from "../../../lib/vectorGraphics";

function StatisticCard(props: ComponentProps<typeof Statistic>) {
  return (
    <Col xs={24} sm={12} md={8} lg={6}>
      <Card>
        <Statistic {...props} />
      </Card>
    </Col>
  );
}

/** The user's totals and averages, one card each. */
export function ProfileStatistics({ stats }: { stats: Partial<UserStatsDto> }) {
  const { t } = useTranslation();
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
      <StatisticCard
        title={t("profile.totalPans") || "Total Pans"}
        value={stats.total_pans || 0}
        prefix={VectorGraphics.HISTORY}
      />
      <StatisticCard title={t("profile.totalRatings") || "Ratings Given"} value={stats.total_ratings_given || 0} />
      <StatisticCard
        title={t("profile.averageRating") || "Avg Rating"}
        value={stats.average_rating_received || 0}
        precision={2}
        suffix="/ 5"
      />
      <StatisticCard
        title={t("profile.achievementPoints") || "Achievement Points"}
        value={stats.total_achievement_points || 0}
        prefix={VectorGraphics.ACHIEVEMENTS}
      />
      {stats.average_ingredients_per_pan !== undefined && (
        <StatisticCard
          title={t("profile.avgIngredientsPerPan") || "Avg Ingredients"}
          value={stats.average_ingredients_per_pan || 0}
          precision={1}
        />
      )}
      {stats.sessions_participated !== undefined && (
        <StatisticCard
          title={t("profile.sessionsParticipated") || "Sessions"}
          value={stats.sessions_participated || 0}
        />
      )}
    </Row>
  );
}
