import { Row, Col, Card, Checkbox, Button } from "antd";
import { useTranslation } from "react-i18next";
import { IngredientCountControl } from "./IngredientCountControl";
import { useGetAvailableCounts } from "../../api/generated/endpoints/ingredients/ingredients";
import { useAppStore } from "../../AppSlice";
import { countOr } from "./countOr";
import styles from "./GenerateView/GenerateView.module.css";
import type { RollCount } from "./GenerateView/useClassicRollCounts";

interface ClassicRollViewProps {
  fill: RollCount;
  sauce: RollCount;
  canGenerate: boolean;
  onGenerateClicked: () => void;
  rollPreparationType: boolean;
  setRollPreparationType: (value: boolean) => void;
  rollCheese: boolean;
  setRollCheese: (value: boolean) => void;
}

/** The controls of a classic roll: how many fills and sauces, and whether to roll preparation type and cheese. */
export function ClassicRollView({
  fill,
  sauce,
  canGenerate,
  onGenerateClicked,
  rollPreparationType,
  setRollPreparationType,
  rollCheese,
  setRollCheese,
}: ClassicRollViewProps) {
  const { t } = useTranslation();
  const sessionKey = useAppStore((state) => state.session?.key) ?? "";
  const { data: counts } = useGetAvailableCounts(
    { session_key: sessionKey },
    { swr: { enabled: !!sessionKey } },
  );
  const availableFillCount = countOr(counts?.fill_count, fill.total);
  const availableSauceCount = countOr(counts?.sauce_count, sauce.total);
  const totalFillCountFromApi = countOr(counts?.total_fill_count, fill.total);
  const totalSauceCountFromApi = countOr(counts?.total_sauce_count, sauce.total);
  return (
    <div className={`${styles.flexColumn} ${styles.paddingVertical8}`}>
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={24} md={12}>
          <IngredientCountControl
            label={t("ingredient.ingredientCount")}
            type="fill"
            count={fill.count}
            availableCount={availableFillCount}
            totalCount={totalFillCountFromApi}
            onIncrement={fill.increment}
            onDecrement={fill.decrement}
            onChange={fill.change}
          />
        </Col>
        <Col xs={24} sm={24} md={12}>
          <IngredientCountControl
            label={t("ingredient.sauceCount")}
            type="sauce"
            count={sauce.count}
            availableCount={availableSauceCount}
            totalCount={totalSauceCountFromApi}
            onIncrement={sauce.increment}
            onDecrement={sauce.decrement}
            onChange={sauce.change}
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
