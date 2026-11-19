import { Card, Space, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { PanDto } from "../../../api/generated/model";
import { displayName } from "../../../shared/displayName";
import { IngredientDisplay } from "../../../shared/IngredientDisplay/IngredientDisplay";
import { formatDateTime, formatRating, useLanguage } from "../../../lib/language";
import { panCardStyle } from "../panCardStyle";

const { Title, Text } = Typography;

/** One of the user's pans, framed in their border. */
export function ProfilePanCard({ pan }: { pan: PanDto }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const style = panCardStyle(pan.author);

  const card = (
    <Card style={style.card} className={style.cardClassName} styles={{ body: { padding: "12px" } }}>
      <Space orientation="vertical" size="small" style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Space orientation="vertical" size={0} style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, fontSize: "1rem", marginBottom: "4px" }}>
              {displayName(pan.name, t)}
            </Title>
            <Text type="secondary" style={{ fontSize: "0.7rem" }}>
              {formatDateTime(pan.timestamp, language)}
            </Text>
          </Space>
          {pan.rating > 0 && (
            <div style={{ textAlign: "right", marginLeft: "8px" }}>
              <Tag color="gold" style={{ fontSize: "0.7rem" }}>
                {formatRating(pan.rating, language)}
              </Tag>
            </div>
          )}
        </div>
        <div>
          {pan.ingredients.length > 0 ? (
            <Space wrap size="small">
              {pan.ingredients.map((ingredient) => (
                <IngredientDisplay
                  key={ingredient.id}
                  ingredient={ingredient}
                  variant="badge"
                  showTags={false}
                  showIcon={true}
                />
              ))}
            </Space>
          ) : (
            <Text type="secondary" style={{ fontSize: "0.85rem" }}>
              {t("ingredient.noIngredients")}
            </Text>
          )}
        </div>
      </Space>
    </Card>
  );

  return style.wrapper ? (
    <div style={style.wrapper} className={style.wrapperClassName}>
      {card}
    </div>
  ) : (
    card
  );
}
