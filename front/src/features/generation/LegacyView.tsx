import React from "react";
import { Row, Col, Card, Checkbox, Button } from "antd";
import { IngredientCountControl } from "./IngredientCountControl";
import { useIngredientStore } from "./GenerateView/ingredientStore";
import { useAvailableIngredientCounts } from "./hooks/useAvailableIngredientCounts";
import styles from "./GenerateView/GenerateView.module.css";

interface LegacyViewProps {
  t: (key: string) => string;
  numFill: number;
  numSauce: number;
  totalFillCount: number;
  totalSauceCount: number;
  canGenerate: boolean;
  onGenerateClicked: () => void;
  rollPreparationType: boolean;
  setRollPreparationType: (value: boolean) => void;
  rollCheese: boolean;
  setRollCheese: (value: boolean) => void;
  onUpdateFill: (value: number) => void;
  onUpdateSauce: (value: number) => void;
  onFillIncrement: () => void;
  onFillDecrement: () => void;
  onSauceIncrement: () => void;
  onSauceDecrement: () => void;
  onFillChange: (value: number) => void;
  onSauceChange: (value: number) => void;
}

export const LegacyView: React.FC<LegacyViewProps> = ({
  t,
  numFill,
  numSauce,
  totalFillCount,
  totalSauceCount,
  onFillChange,
  onSauceChange,
  onFillIncrement,
  onFillDecrement,
  onSauceIncrement,
  onSauceDecrement,
  canGenerate,
  onGenerateClicked,
  rollPreparationType,
  setRollPreparationType,
  rollCheese,
  setRollCheese,
}) => {
  // Get available counts from the API
  const {
    getAvailableFillCount,
    getAvailableSauceCount,
    getTotalFillCount,
    getTotalSauceCount,
  } = useAvailableIngredientCounts();
  const availableFillCount = getAvailableFillCount(totalFillCount);
  const availableSauceCount = getAvailableSauceCount(totalSauceCount);
  const totalFillCountFromApi = getTotalFillCount(totalFillCount);
  const totalSauceCountFromApi = getTotalSauceCount(totalSauceCount);
  return (
    <div className={styles.flexColumn} style={{ padding: "8px 0" }}>
      <Row gutter={[24, 24]} className={styles.marginBottom16}>
        <Col xs={24} sm={24} md={12}>
          <IngredientCountControl
            label={t("ingredient.ingredientCount")}
            type="fill"
            count={numFill}
            availableCount={availableFillCount}
            totalCount={totalFillCountFromApi}
            onIncrement={onFillIncrement}
            onDecrement={onFillDecrement}
            onChange={onFillChange}
          />
        </Col>
        <Col xs={24} sm={24} md={12}>
          <IngredientCountControl
            label={t("ingredient.sauceCount")}
            type="sauce"
            count={numSauce}
            availableCount={availableSauceCount}
            totalCount={totalSauceCountFromApi}
            onIncrement={onSauceIncrement}
            onDecrement={onSauceDecrement}
            onChange={onSauceChange}
          />
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Card className={styles.cardNoMargin}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <Checkbox
                checked={rollPreparationType}
                onChange={(e) => setRollPreparationType(e.target.checked)}
                className={styles.checkbox}
              >
                {t("generate.rollPreparationType") || "Roll preparation type"}
              </Checkbox>
              <Checkbox
                checked={rollCheese}
                onChange={(e) => setRollCheese(e.target.checked)}
                className={styles.checkbox}
              >
                {t("generate.rollCheese") || "Roll cheese level"}
              </Checkbox>
            </div>
          </Card>
        </Col>
      </Row>
      <Row style={{ marginTop: "24px" }}>
        <Col span={24}>
          <Button
            type="primary"
            size="large"
            onClick={onGenerateClicked}
            disabled={!canGenerate}
            style={{ marginTop: "16px" }}
          >
            {t("generate.generateButton")}
          </Button>
        </Col>
      </Row>
    </div>
  );
};
