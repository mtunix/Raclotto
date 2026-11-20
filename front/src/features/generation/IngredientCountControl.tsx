import { Card, Typography, Form } from "antd";
import { useTranslation } from "react-i18next";
import { CountStepper } from "./CountStepper";
import styles from "./GenerateView/GenerateView.module.css";

const { Text } = Typography;

export type IngredientType = "fill" | "sauce";

interface IngredientCountControlProps {
  label: string;
  type: IngredientType;
  count: number;
  availableCount: number;
  totalCount: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function IngredientCountControl({
  label,
  count,
  availableCount,
  totalCount,
  onIncrement,
  onDecrement,
  onChange,
}: IngredientCountControlProps) {
  const { t } = useTranslation();
  return (
    <Card className={styles.card}>
      <Form.Item className="mb-0">
        <div className={`${styles.flexColumn} ${styles.gap16}`}>
          <div className={`${styles.optionHeader} ${styles.optionHeaderSpaced}`}>
            <div className={styles.subtitle}>{label}</div>
            <Text type="secondary">
              {t("generate.available")}: {availableCount} / {totalCount}
            </Text>
          </div>
          <CountStepper
            value={count}
            min={0}
            max={availableCount}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
            onChange={onChange}
          />
        </div>
      </Form.Item>
    </Card>
  );
}
