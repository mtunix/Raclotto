import type { ReactNode } from "react";
import { Card, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { IngredientDto, UserSummaryDto } from "../../api/generated/model";
import { IngredientDisplay } from "../IngredientDisplay/IngredientDisplay";
import { panCardStyle } from "./panCardStyle";
import "./PanCard.css";

/** A pan's card, framed in its author's border, texture and glow. */
export function PanCard({ author, children }: { author: UserSummaryDto | null; children: ReactNode }) {
  const style = panCardStyle(author);
  const glow = style.glow ? " pan-card-glow-card" : "";

  if (!style.wrapper) {
    return (
      <Card className={`pan-card${glow}`} style={style.card} classNames={{ body: "pan-card-body" }}>
        {children}
      </Card>
    );
  }
  return (
    <div className={`pan-card-texture${style.glow ? " pan-card-glow-wrapper" : ""}`} style={style.wrapper}>
      <Card className={`pan-card pan-card-textured${glow}`} style={style.card} classNames={{ body: "pan-card-body" }}>
        {children}
      </Card>
    </div>
  );
}

/** A pan's ingredients as badges, or that it has none. */
export function PanCardIngredients({ ingredients }: { ingredients: IngredientDto[] }) {
  const { t } = useTranslation();

  return ingredients.length > 0 ? (
    <Space wrap size="small">
      {ingredients.map((ingredient) => (
        <IngredientDisplay key={ingredient.id} ingredient={ingredient} variant="badge" showTags={false} showIcon={true} />
      ))}
    </Space>
  ) : (
    <Typography.Text type="secondary" className="pan-card-empty">
      {t("ingredient.noIngredients")}
    </Typography.Text>
  );
}
