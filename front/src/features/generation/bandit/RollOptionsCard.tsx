import { Card, Checkbox, Col, Row } from "antd";
import { useTranslation } from "react-i18next";
import styles from "../GenerateView/GenerateView.module.css";

interface RollOptionsCardProps {
    rollPreparationType: boolean;
    onRollPreparationTypeChange: (checked: boolean) => void;
    rollCheese: boolean;
    onRollCheeseChange: (checked: boolean) => void;
    disabled: boolean;
}

export function RollOptionsCard(props: RollOptionsCardProps) {
    const { t } = useTranslation();
    return (
        <Row className={styles.marginBottom32}>
            <Col span={24}>
                <Card className={styles.cardNoMargin} classNames={{ body: styles.optionsCardBody }}>
                    <div className={`${styles.flexColumn} ${styles.gap16}`}>
                        <Checkbox
                            checked={props.rollPreparationType}
                            onChange={(e) => props.onRollPreparationTypeChange(e.target.checked)}
                            disabled={props.disabled}
                            className={styles.checkbox}
                        >
                            {t("generate.rollPreparationType")}
                        </Checkbox>
                        <Checkbox
                            checked={props.rollCheese}
                            onChange={(e) => props.onRollCheeseChange(e.target.checked)}
                            disabled={props.disabled}
                            className={styles.checkbox}
                        >
                            {t("generate.rollCheese")}
                        </Checkbox>
                    </div>
                </Card>
            </Col>
        </Row>
    );
}
