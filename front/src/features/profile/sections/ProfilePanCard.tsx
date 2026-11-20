import { Space, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { PanDto } from "../../../api/generated/model";
import { displayName } from "../../../shared/displayName";
import { formatDateTime, formatRating, useLanguage } from "../../../lib/language";
import { PanCard, PanCardIngredients } from "../../../shared/PanCard/PanCard";
import { PanActionsMenu } from "../../history/components/PanActionsMenu";

const { Title, Text } = Typography;

/** One of the user's pans, framed in their border; its author can delete it from its menu. */
export function ProfilePanCard({ pan, onDeleted }: { pan: PanDto; onDeleted: (panId: number) => void }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <PanCard author={pan.author}>
      <Space orientation="vertical" size="small" className="full-width">
        <div className="pan-card-header">
          <Space orientation="vertical" size={0} className="pan-card-heading">
            <Title level={4} className="pan-card-title">
              {displayName(pan.name, t)}
            </Title>
            <Text type="secondary" className="pan-card-meta">
              {formatDateTime(pan.timestamp, language)}
            </Text>
          </Space>
          {pan.rating > 0 && (
            <div className="pan-card-side">
              <Tag color="gold" className="pan-card-score">
                {formatRating(pan.rating, language)}
              </Tag>
            </div>
          )}
          <PanActionsMenu pan={pan} onDeleted={onDeleted} />
        </div>
        <PanCardIngredients ingredients={pan.ingredients} />
      </Space>
    </PanCard>
  );
}
