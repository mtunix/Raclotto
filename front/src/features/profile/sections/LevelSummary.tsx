import { Progress, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { LevelDto } from "../../../api/generated/model";
import { formatNumber, useLanguage } from "../../../lib/language";
import { levelProgress } from "../../../model/levelProgress";
import { PROGRESS_GRADIENT } from "../../../shared/progressGradient";
import "../profile.css";

const { Text } = Typography;

interface LevelSummaryProps {
  level: LevelDto;
  nextLevel: LevelDto | null;
  experiencePoints: number;
}

/** The user's level and XP, and how far they are from the next level. */
export function LevelSummary({ level, nextLevel, experiencePoints }: LevelSummaryProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const levelName = ({ name }: LevelDto) => String(t(name, { defaultValue: name }));
  const { xpInLevel, xpNeeded, percent } = levelProgress(experiencePoints, level, nextLevel);

  return (
    <div className="mt-12">
      <div className="mb-8">
        <Tag color="blue" className="profile-level-tag">
          <strong>
            {t("profile.level")} {level.id}: {levelName(level)}
          </strong>
        </Tag>
        <Text type="secondary" className="profile-level-xp">
          {formatNumber(experiencePoints, language)} XP
        </Text>
      </div>
      {nextLevel ? (
        <div className="mt-8">
          <div className="profile-level-labels">
            <Text type="secondary" className="profile-level-label">
              {t("level.progressTo")} {levelName(nextLevel)}
            </Text>
            <Text type="secondary" className="profile-level-label">
              {formatNumber(xpInLevel, language)} / {formatNumber(xpNeeded, language)} XP
            </Text>
          </div>
          <Progress
            percent={percent}
            strokeColor={PROGRESS_GRADIENT}
            showInfo={false}
            size="small"
          />
        </div>
      ) : (
        <div className="mt-8">
          <Text type="secondary" className="profile-level-label profile-level-max">
            {t("level.maximumLevelReached")}
          </Text>
        </div>
      )}
    </div>
  );
}
