import React from "react";
import { Card, Col, Empty, Row, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { AchievementDto } from "../../../api/generated/model";
import { achievementValueColor } from "../../../shared/achievementValueColor";

const { Title, Text } = Typography;

/** The achievements the user unlocked, with their points. */
export function AchievementList({ achievements }: { achievements: AchievementDto[] }) {
  const { t } = useTranslation();
  return (
    <Card title={t("profile.achievements") || "Achievements"} style={{ marginBottom: "24px" }}>
      {achievements.length > 0 ? (
        <Row gutter={[16, 16]}>
          {achievements.map((achievement) => (
            <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
              <Card size="small" style={{ border: "2px solid #52c41a", backgroundColor: "#f6ffed" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <Title level={5} style={{ margin: 0, fontSize: "14px" }}>
                      {achievement.title || ""}
                    </Title>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {achievement.description || ""}
                    </Text>
                  </div>
                  <Tag color={achievementValueColor(achievement.value || 0)}>
                    {achievement.value || 0} {t("achievement.points") || "pts"}
                  </Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          description={t("profile.noAchievements") || "No achievements unlocked yet"}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
}
