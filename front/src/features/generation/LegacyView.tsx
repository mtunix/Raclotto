import { Row, Col, Card, Checkbox, Button } from "antd";
import { IngredientCountControl } from "./IngredientCountControl";
import { useGetAvailableCounts } from "../../api/generated/endpoints/ingredients/ingredients";
import { useAppStore } from "../../AppSlice";
import { countOr } from "./countOr";
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

export function LegacyView({
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
}: LegacyViewProps) {
  const sessionKey = useAppStore((state) => state.session?.key) ?? "";
  const { data: counts } = useGetAvailableCounts(
    { session_key: sessionKey },
    { swr: { enabled: !!sessionKey } },
  );
  const availableFillCount = countOr(counts?.fill_count, totalFillCount);
  const availableSauceCount = countOr(counts?.sauce_count, totalSauceCount);
  const totalFillCountFromApi = countOr(counts?.total_fill_count, totalFillCount);
  const totalSauceCountFromApi = countOr(counts?.total_sauce_count, totalSauceCount);
  return (
    <div className={`${styles.flexColumn} ${styles.paddingVertical8}`}>
      <Row gutter={[24, 24]}>
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
            <div className={`${styles.flexColumn} ${styles.gap16}`}>
              <Checkbox
                checked={rollPreparationType}
                onChange={(e) => setRollPreparationType(e.target.checked)}
                className={styles.checkbox}
              >
                {t("generate.rollPreparationType")}
              </Checkbox>
              <Checkbox
                checked={rollCheese}
                onChange={(e) => setRollCheese(e.target.checked)}
                className={styles.checkbox}
              >
                {t("generate.rollCheese")}
              </Checkbox>
            </div>
          </Card>
        </Col>
      </Row>
      <Row className="mt-24">
        <Col span={24}>
          <Button
            type="primary"
            size="large"
            onClick={onGenerateClicked}
            disabled={!canGenerate}
            className="mt-16"
          >
            {t("generate.generateButton")}
          </Button>
        </Col>
      </Row>
    </div>
  );
}
