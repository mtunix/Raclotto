import { Progress, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { LevelDto } from "../../../api/generated/model";
import { levelProgress } from "../../../model/levelProgress";

const { Text } = Typography;

interface LevelSummaryProps {
  level: LevelDto;
  nextLevel: LevelDto | null;
  experiencePoints: number;
}

/** The user's level and XP, and how far they are from the next level. */
export function LevelSummary({ level, nextLevel, experiencePoints }: LevelSummaryProps) {
  const { t } = useTranslation();
  const levelName = ({ name }: LevelDto) => String(t(name, { defaultValue: name }));
  const { xpInLevel, xpNeeded, percent } = levelProgress(experiencePoints, level, nextLevel);

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ marginBottom: "8px" }}>
        <Tag color="blue" style={{ fontSize: "14px", padding: "4px 12px" }}>
          <strong>
            {t("profile.level") || "Level"} {level.id}: {levelName(level)}
          </strong>
        </Tag>
        <Text type="secondary" style={{ marginLeft: "8px", fontSize: "14px" }}>
          {experiencePoints} XP
        </Text>
      </div>
      {nextLevel ? (
        <div style={{ marginTop: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {t("level.progressTo")} {levelName(nextLevel)}
            </Text>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {xpInLevel} / {xpNeeded} XP
            </Text>
          </div>
          <Progress
            percent={percent}
            strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
            showInfo={false}
            size="small"
          />
        </div>
      ) : (
        <div style={{ marginTop: "8px" }}>
          <Text type="secondary" style={{ fontSize: "12px", fontStyle: "italic" }}>
            {t("level.maximumLevelReached")}
          </Text>
        </div>
      )}
    </div>
  );
}
