import type { ComponentProps } from "react";
import { Card, Col, Row, Statistic } from "antd";
import { useTranslation } from "react-i18next";
import type { UserStatsDto } from "../../../api/generated/model";
import { numberFormatter, useLanguage } from "../../../lib/language";
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
  const language = useLanguage();
  const whole = numberFormatter(language);
  return (
    <Row gutter={[16, 16]} className="mb-24">
      <StatisticCard
        title={t("profile.totalPans")}
        value={stats.total_pans || 0}
        formatter={whole}
        prefix={VectorGraphics.HISTORY}
      />
      <StatisticCard title={t("profile.totalRatings")} value={stats.total_ratings_given || 0} formatter={whole} />
      <StatisticCard
        title={t("profile.averageRating")}
        value={stats.average_rating_received || 0}
        formatter={numberFormatter(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        suffix="/ 5"
      />
      <StatisticCard
        title={t("profile.achievementPoints")}
        value={stats.total_achievement_points || 0}
        formatter={whole}
        prefix={VectorGraphics.ACHIEVEMENTS}
      />
      {stats.average_ingredients_per_pan !== undefined && (
        <StatisticCard
          title={t("profile.avgIngredientsPerPan")}
          value={stats.average_ingredients_per_pan || 0}
          formatter={numberFormatter(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        />
      )}
      {stats.sessions_participated !== undefined && (
        <StatisticCard
          title={t("profile.sessionsParticipated")}
          value={stats.sessions_participated || 0}
          formatter={whole}
        />
      )}
    </Row>
  );
}
