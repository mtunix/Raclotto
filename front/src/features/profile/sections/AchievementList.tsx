import { Card, Col, Empty, Row, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { AchievementDto } from "../../../api/generated/model";
import { formatNumber, useLanguage } from "../../../lib/language";
import { achievementDescription, achievementTitle } from "../../../shared/achievementText";
import { achievementValueColor } from "../../../shared/achievementValueColor";
import "../profile.css";

const { Title, Text } = Typography;

/** The achievements the user unlocked, with their points. */
export function AchievementList({ achievements }: { achievements: AchievementDto[] }) {
  const { t } = useTranslation();
  const language = useLanguage();
  return (
    <Card title={t("profile.achievements")} className="mb-24">
      {achievements.length > 0 ? (
        <Row gutter={[16, 16]}>
          {achievements.map((achievement) => (
            <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
              <Card size="small" className="profile-achievement">
                <div className="profile-achievement-header">
                  <div>
                    <Title level={5} className="profile-achievement-title">
                      {achievementTitle(achievement, t)}
                    </Title>
                    <Text type="secondary" className="profile-level-label">
                      {achievementDescription(achievement, t)}
                    </Text>
                  </div>
                  <Tag color={achievementValueColor(achievement.value || 0)}>
                    {formatNumber(achievement.value, language)} {t("achievement.points")}
                  </Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          description={t("profile.noAchievements")}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
}
